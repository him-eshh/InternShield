import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { req } from "./helpers";

import { POST } from "@/app/api/sender/route";

const fetchMock = vi.fn();
const mxOk = () => Response.json({ Status: 0, Answer: [{ type: 15, data: "10 mx.example." }] });
const rdapOk = () => Response.json({ events: [{ eventAction: "registration", eventDate: "2015-03-02T00:00:00Z" }] });

beforeEach(() => {
  resetServerState();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    String(url).includes("rdap.org") ? rdapOk() : String(url).includes("hunter.io") ? Response.json({ data: { pattern: "{first}.{last}", webmail: false, disposable: false } }) : mxOk(),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.unstubAllEnvs();
  vi.stubEnv("ALLOWED_ORIGINS", "");
  vi.stubEnv("HUNTER_API_KEY", "");
});

afterEach(() => vi.unstubAllGlobals());

const urls = () => fetchMock.mock.calls.map((c) => String(c[0]));
const call = (email: string, ip = "12.0.0.1") => POST(req("sender", { email }, { ip }));

describe("sender route", () => {
  it("skips RDAP for gmail.com but still checks MX", async () => {
    const { status, data } = await (await call("someone@gmail.com")).json();
    expect(status).toBe("done");
    expect(data).toMatchObject({ domain: "gmail.com", freeEmail: true, registeredAt: null, hasMx: true, hunter: null });
    expect(urls().some((u) => u.includes("rdap.org"))).toBe(false);
  });

  it("reads the registration date and MX for a company domain (registrable domain via subdomain)", async () => {
    const { data } = await (await call("jo@mail.acme.co.uk")).json();
    expect(data).toMatchObject({ domain: "acme.co.uk", freeEmail: false, registeredAt: "2015-03-02T00:00:00Z", hasMx: true });
    expect(urls().some((u) => u.includes("rdap.org/domain/acme.co.uk"))).toBe(true);
  });

  it("returns null sub-results (not a failure) when RDAP 404s and DNS is down", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("rdap.org")) return new Response("{}", { status: 404 });
      throw new Error("network down");
    });
    const body = await (await call("jo@weird.example")).json();
    expect(body.status).toBe("done");
    expect(body.data).toMatchObject({ registeredAt: null, hasMx: null });
  });

  it("falls back to Cloudflare when Google DoH fails", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("dns.google")) throw new Error("down");
      if (String(url).includes("rdap.org")) return rdapOk();
      return mxOk();
    });
    const { data } = await (await call("jo@acme.com")).json();
    expect(data.hasMx).toBe(true);
    expect(urls().some((u) => u.includes("cloudflare-dns.com"))).toBe(true);
  });

  it("caches RDAP and MX by domain", async () => {
    await call("a@acme.com");
    const first = fetchMock.mock.calls.length;
    await call("b@acme.com", "12.0.0.2");
    expect(fetchMock.mock.calls.length).toBe(first);
  });

  it("only runs Hunter when a key is set", async () => {
    await call("a@acme.com");
    expect(urls().some((u) => u.includes("hunter.io"))).toBe(false);
    vi.stubEnv("HUNTER_API_KEY", "hk");
    const { data } = await (await call("a@acme.com", "12.0.0.3")).json();
    expect(data.hunter).toEqual({ pattern: "{first}.{last}", webmail: false, disposable: false });
  });

  it("rejects a bad email (400)", async () => {
    expect((await call("not-an-email")).status).toBe(400);
  });
});
