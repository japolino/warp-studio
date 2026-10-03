// A pretend Lumiverse host for tests: characters, world books and entries in
// memory, a scripted helper model, user storage. No network, no models, no keys.

export interface Sent { type: string; [k: string]: unknown }

export interface FakeEntry { id: string; world_book_id: string; comment: string; content: string; order_value: number; disabled: boolean; key: string[] }
export interface FakeBook { id: string; name: string; description: string; metadata: Record<string, unknown>; entries: FakeEntry[] }
export interface FakeCharacter {
  id: string; name: string; description: string; personality: string; scenario: string; first_mes: string;
  creator_notes: string; tags: string[]; world_book_ids: string[];
}

export interface FakeHost {
  sent: Sent[];
  toasts: string[];
  quiet: { system: string; user: string; connection?: string; temperature?: number }[];
  storage: Map<string, unknown>;
  characters: Map<string, FakeCharacter>;
  books: Map<string, FakeBook>;
  /** Every world-book or character write, in order ("create book b3", "update character c1"…). */
  writes: string[];
  /** Change what `entries.list` returns (to test the read-back guard). */
  tamper: ((bookId: string, data: FakeEntry[]) => FakeEntry[]) | null;
  /** `characters.update` throws (after it committed, when `afterCommit`). */
  failUpdate: null | { afterCommit: boolean };
  /** Messages sent to the frontend of one type. */
  of<T extends Sent = Sent>(type: string): T[];
}

let ids = 0;
const nextId = (p: string) => `${p}${++ids}`;

export function character(o: Partial<FakeCharacter> & { id: string; name: string }): FakeCharacter {
  return { description: "", personality: "", scenario: "", first_mes: "", creator_notes: "", tags: [], world_book_ids: [], ...o };
}

/** A book with entries; `entries` as [comment, content] pairs (order 10, 20…). */
export function book(o: { id: string; name: string; metadata?: Record<string, unknown>; entries?: [string, string][] }): FakeBook {
  return {
    id: o.id, name: o.name, description: "", metadata: o.metadata ?? {},
    entries: (o.entries ?? []).map(([comment, content], i) => ({ id: `${o.id}-e${i}`, world_book_id: o.id, comment, content, order_value: (i + 1) * 10, disabled: true, key: [] })),
  };
}

export function fakeHost(o: {
  characters?: FakeCharacter[];
  books?: FakeBook[];
  /** What the helper model answers. */
  helper?: (system: string, user: string) => string;
  /** connections.list throws (no generation permission). */
  noGeneration?: boolean;
} = {}): FakeHost {
  const h: FakeHost = {
    sent: [], toasts: [], quiet: [], storage: new Map(), writes: [], tamper: null, failUpdate: null,
    characters: new Map((o.characters ?? []).map((c) => [c.id, structuredClone(c)])),
    books: new Map((o.books ?? []).map((b) => [b.id, structuredClone(b)])),
    of: <T extends Sent>(type: string) => h.sent.filter((m) => m.type === type) as T[],
  };
  const toast = (level: string) => (message: string) => { h.toasts.push(`${level}: ${message}`); };
  const dto = (b: FakeBook) => ({ id: b.id, name: b.name, description: b.description, metadata: structuredClone(b.metadata), created_at: 0, updated_at: 0 });
  (globalThis as Record<string, unknown>).spindle = {
    sendToFrontend: (m: Sent) => { h.sent.push(structuredClone(m)); },
    toast: { success: toast("success"), info: toast("info"), warning: toast("warning"), error: toast("error") },
    log: { error: () => {}, info: () => {}, warn: () => {} },
    on: () => () => {},
    onFrontendMessage: () => () => {},
    characters: {
      list: async () => ({ data: [...h.characters.values()].map((c) => structuredClone(c)), total: h.characters.size }),
      get: async (id: string) => (h.characters.has(id) ? structuredClone(h.characters.get(id)!) : null),
      update: async (id: string, input: Partial<FakeCharacter>) => {
        const c = h.characters.get(id);
        if (!c) throw new Error("Character not found");
        if (h.failUpdate && !h.failUpdate.afterCommit) throw new Error("update failed");
        Object.assign(c, structuredClone(input));
        h.writes.push(`update character ${id}`);
        if (h.failUpdate?.afterCommit) throw new Error("update failed after commit");
        return structuredClone(c);
      },
    },
    world_books: {
      get: async (id: string) => (h.books.has(id) ? dto(h.books.get(id)!) : null),
      create: async (input: { name: string; description?: string; metadata?: Record<string, unknown> }) => {
        const b: FakeBook = { id: nextId("book"), name: input.name, description: input.description ?? "", metadata: structuredClone(input.metadata ?? {}), entries: [] };
        h.books.set(b.id, b);
        h.writes.push(`create book ${b.id}`);
        return dto(b);
      },
      delete: async (id: string) => { h.writes.push(`delete book ${id}`); return h.books.delete(id); },
      entries: {
        list: async (bookId: string, opts: { offset?: number; limit?: number } = {}) => {
          const b = h.books.get(bookId);
          let data = b ? b.entries.map((e) => structuredClone(e)) : [];
          if (h.tamper) data = h.tamper(bookId, data);
          const offset = opts.offset ?? 0, limit = opts.limit ?? 50;
          return { data: data.slice(offset, offset + limit), total: data.length };
        },
        create: async (bookId: string, input: { comment?: string; content?: string; order_value?: number; disabled?: boolean; key?: string[] }) => {
          const b = h.books.get(bookId);
          if (!b) throw new Error("Book not found");
          const e: FakeEntry = { id: nextId("entry"), world_book_id: bookId, comment: input.comment ?? "", content: input.content ?? "", order_value: input.order_value ?? 100, disabled: input.disabled ?? false, key: input.key ?? [] };
          b.entries.push(e);
          h.writes.push(`create entry in ${bookId}`);
          return structuredClone(e);
        },
      },
    },
    generate: {
      quiet: async (req: { messages: { content: string }[]; connection_id?: string; parameters?: { temperature?: number }; signal?: AbortSignal }) => {
        if (req.signal?.aborted) throw new Error("aborted");
        const [system, user] = [req.messages[0]?.content ?? "", req.messages[1]?.content ?? ""];
        h.quiet.push({ system, user, connection: req.connection_id, temperature: req.parameters?.temperature });
        return { content: o.helper ? o.helper(system, user) : "" };
      },
    },
    connections: {
      list: async () => { if (o.noGeneration) throw new Error("permission denied"); return [{ id: "fast", name: "Fast helper" }]; },
    },
    userStorage: {
      getJson: async (path: string, opts?: { fallback?: unknown }) => (h.storage.has(path) ? structuredClone(h.storage.get(path)) : opts?.fallback),
      setJson: async (path: string, v: unknown) => { h.storage.set(path, structuredClone(v)); },
      delete: async (path: string) => { h.storage.delete(path); },
    },
  };
  return h;
}
