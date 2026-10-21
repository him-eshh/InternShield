// Shared test helpers for tests/api. Mocks live in each test file (vi.mock is hoisted per file).
import { emptyFacts } from "@/lib/server/extract";

export function req(
  path: string,
  body: unknown,
  opts: { origin?: string | null; ip?: string; query?: string; raw?: string } = {},
): Request {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": opts.ip ?? "9.9.9.9" };
  if (opts.origin !== null) headers.origin = opts.origin ?? "http://localhost:3000";
  return new Request(`http://localhost:3000/api/${path}${opts.query ?? ""}`, {
    method: "POST",
    headers,
    body: opts.raw ?? JSON.stringify(body),
  });
}

/** Mock of groq-sdk's `create(...)` return value: a successful completion. */
export function groqOk(content: string, headers: Record<string, string> = {}) {
  return {
    withResponse: () =>
      Promise.resolve({
        data: { choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 10 } },
        response: { headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } },
      }),
  };
}

/** Mock of an SDK APIError. */
export function groqErr(status: number, headers: Record<string, string> = {}) {
  return {
    withResponse: () =>
      Promise.reject(
        Object.assign(new Error(`status ${status}`), {
          status,
          headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
        }),
      ),
  };
}

export const MESSAGE =
  "Hi, this is Pat from Acme Robotics. We are hiring a Software Intern at $20/hour. Please buy a gift card to start.";

export function modelFacts(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ...emptyFacts(true),
    company: { value: "Acme Robotics", quote: "Pat from Acme Robotics" },
    role: { value: "Software Intern", quote: "hiring a Software Intern" },
    pay: { value: "$20/hour", quote: "$20/hour" },
    asks: [{ kind: "gift_cards", quote: "buy a gift card" }],
    ...over,
  });
}
