# API facts for InternShield (checked Oct 20, 2026)

> Dated research snapshot, not a live account-quota guarantee. Provider models, prices, and free-tier limits may change; check the linked official provider docs and the account's limits before relying on these figures. The app's current configurable guard defaults are in `lib/server/guard.ts` and `.env.example`. Vision is used for Check screenshot transcription; it is no longer a hypothetical Tier 2 feature.

Sources are official docs, fetched on Oct 20, 2026. Lines marked **UNVERIFIED** could not be confirmed from an official page.

## Plain-language summary

- **Groq (AI):** Use **`openai/gpt-oss-20b`** for extraction. It is the fastest model (about 1,000 tokens/sec) and supports **strict structured outputs**, which force the JSON to match your schema. Use `openai/gpt-oss-120b` if quality falls short. The free plan needs **no credit card**, and only the paid Developer plan bills, so the free plan can't charge you. The free limits per model are about **30 requests/min, 1,000/day, 8,000 tokens/min, 200,000 tokens/day**. The 8K tokens/min is the real bottleneck: it allows roughly 2 to 4 checks a minute. For screenshots later, the vision model is **`qwen/qwen3.8-27b`**. SDK: `groq-sdk` (v1.6.0).
  - Heads up: the Llama models (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) are now listed as "Enterprise / Contact Sales" and are missing from the free rate-limit table. Don't build on them.
- **Tavily (search):** **1,000 free credits/month, no card.** A basic search costs **1 credit** (so do `fast` and `ultra-fast`) and an advanced search costs **2**. Dev keys allow **100 requests/min**. You only get charged if you turn on pay-as-you-go; otherwise you get a `432` error when credits run out. SDK: `@tavily/core` (v0.7.14).
  - Watch out: `auto_parameters: true` can switch a search to advanced (2 credits). Set `search_depth: "basic"` explicitly.
- **Domain age (RDAP):** `GET https://rdap.org/domain/<domain>` redirects to the right registry. Look for `events[].eventAction == "registration"`. Free with no key, but limited to **10 requests per 10 seconds**. Tested live and it works.
- **Mail check (MX):** Use the free DNS-over-HTTPS JSON endpoints from Google (`https://dns.google/resolve?name=X&type=MX`) or Cloudflare (`https://cloudflare-dns.com/dns-query?name=X&type=MX` with the header `accept: application/dns-json`). No key needed. Tested live and both work.
- **Hunter.io:** The free plan has **50 credits/month**. Domain Search costs **1 credit per email returned**, and free accounts are capped at `limit+offset ≤ 10`. Use `limit=1`: the response still includes the company's email `pattern`. Two related endpoints are free and don't use credits: **Email Insight** (`/v2/email-insight`, which tells you whether the domain has a known pattern and MX records) and **Domain Finder** (company name → domain).

---

## 1) Groq

**Sources:** [Models](https://console.groq.com/docs/models) · [Structured Outputs](https://console.groq.com/docs/structured-outputs) · [Tool Use](https://console.groq.com/docs/tool-use) · [Rate Limits](https://console.groq.com/docs/rate-limits) · [Vision](https://console.groq.com/docs/vision) · [Billing FAQs](https://console.groq.com/docs/billing-faqs) · [Spend Limits](https://console.groq.com/docs/spend-limits)

### Models for fast JSON extraction

| Model ID | Status | Speed | Strict JSON schema (`strict:true`) | Best-effort json_schema | JSON object mode | Tool calling | Vision |
|---|---|---|---|---|---|---|---|
| `openai/gpt-oss-20b` | **Production** | ~1000 t/s | ✅ | ✅ | ✅ | ✅ (no parallel) | ❌ |
| `openai/gpt-oss-120b` | **Production** | ~500 t/s | ✅ | ✅ | ✅ | ✅ (no parallel) | ❌ |
| `qwen/qwen3.8-27b` | Preview | ~450 t/s | ✅ | ✅ | ✅ | ✅ (parallel) | ✅ |
| `llama-3.3-70b-versatile` / `llama-3.1-8b-instant` | Production, but marked "Enterprise / Contact Sales" | 280 / 560 t/s | ❌ | ❌ | ✅ | ✅ | ❌ |

- Strict mode rules: every property must be listed in `required`, every object needs `additionalProperties: false`, and optional fields are written as `["string","null"]`.
- **Structured outputs don't work with streaming or tool use.** Use one non-streamed call.
- Best-effort mode can return HTTP 400 `Generated JSON does not match the expected schema`, so add a retry.
- Developer (paid) price for gpt-oss-20b is $0.075 in / $0.30 out per 1M tokens. That's not relevant if you stay on the free plan.

### Free-tier rate limits (per organization, from the Rate Limits page)

| Model | RPM | RPD | TPM | TPD |
|---|---|---|---|---|
| openai/gpt-oss-20b | 30 | 1K | 8K | 200K |
| openai/gpt-oss-120b | 30 | 1K | 8K | 200K |
| qwen/qwen3.8-27b | 30 | 1K | 8K | 200K |

- Caveat: the page header says the table shows "base limits for the Developer plan", but the Models page lists Developer limits as 250K TPM / 1K RPM. So the table above is almost certainly the **free** tier. **Check the exact numbers for your org at console.groq.com → Settings → Limits.**
- Hitting a limit returns `429` with a `retry-after` header. `x-ratelimit-remaining-requests` (RPD) and `x-ratelimit-remaining-tokens` (TPM) come back on every response.
- **UNVERIFIED:** whether free accounts can still call the Llama models at all, since they're missing from the free table.

### Card and charges

- Free tier: no credit card (per the Groq community help center and billing docs). A payment method is only required to **upgrade** to Developer. Billing and spend limits only exist on paid plans, so **the free tier can't incur charges**. Keep the account on Free.

### SDK and a minimal example

`npm i groq-sdk` (latest 1.6.0). Endpoint: `POST https://api.groq.com/openai/v1/chat/completions`, OpenAI-compatible.

```ts
// app/api/extract/route.ts (server only; GROQ_API_KEY from env)
import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const res = await groq.chat.completions.create({
  model: "openai/gpt-oss-20b",
  messages: [
    { role: "system", content: "Extract facts from the recruiter message. Every fact must include an exact quote copied from the message." },
    { role: "user", content: messageText },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "extraction",
      strict: true,
      schema: {
        type: "object",
        properties: {
          company: { type: ["string", "null"] },
          sender_email: { type: ["string", "null"] },
          facts: {
            type: "array",
            items: {
              type: "object",
              properties: { kind: { type: "string" }, quote: { type: "string" } },
              required: ["kind", "quote"],
              additionalProperties: false,
            },
          },
        },
        required: ["company", "sender_email", "facts"],
        additionalProperties: false,
      },
    },
  },
});
const data = JSON.parse(res.choices[0].message.content ?? "{}");
```

Fallback with no schema: `response_format: { type: "json_object" }` works on all models, but you must ask for JSON in the prompt.

### Vision (for the Tier 2 screenshot feature)

- `qwen/qwen3.8-27b` (Preview): text and image input, JSON mode, tool use. Max **3 images/request**, each counts as **2,048 input tokens**, and requests are capped at 20 MB. Send `{type:"image_url", image_url:{url:"data:image/png;base64,..."}}` inside the `content` array.
- `meta-models/muse-spark-open`: limited preview, contact sales. Not usable.
- Note: with 8K TPM free, one screenshot uses about 2K tokens of the per-minute budget.

## 2) Tavily

**Sources:** [Credits & Pricing](https://docs.tavily.com/documentation/api-credits) · [Rate Limits](https://docs.tavily.com/documentation/rate-limits) · [Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search) · [JS SDK reference](https://docs.tavily.com/sdk/javascript/reference)

- **Free ("Researcher") plan: 1,000 credits/month, no credit card required.**
- Cost per search: `basic`, `fast`, `ultra-fast` = **1 credit**; `advanced` = **2 credits**.
- Charges: pay-as-you-go ($0.008/credit) only applies if you enable PAYGO. Plan limit exceeded → `432`; PAYGO limit exceeded → `433`.
- Rate limits: **Development key 100 RPM**, Production key 1,000 RPM (needs a paid plan or PAYGO). Over the limit → `429` with `Retry-After`.

### REST: `POST https://api.tavily.com/search`, header `Authorization: Bearer tvly-...`

```json
{
  "query": "Acme Corp software engineering intern careers",
  "search_depth": "basic",
  "max_results": 5,
  "include_domains": ["acme.com", "boards.greenhouse.io", "jobs.lever.co"],
  "include_domains_mode": "prefer",
  "include_answer": false,
  "include_raw_content": false
}
```

Key params:
- `search_depth`: `advanced | basic | fast | ultra-fast`, default `basic`.
- `max_results`: 0 to 20, default 10.
- `include_domains`: up to 300 entries; `exclude_domains`: up to 150.
- `include_domains_mode`: `restrict` (the default, a hard filter) or `prefer`.
- Also available: `topic` (`general|news|finance`), `time_range`, `start_date`/`end_date`, `country`, `exact_match`, `include_usage`.

Response: `results[]` with `title, url, content, score`, plus `response_time` and `request_id`.

### JS SDK: `npm i @tavily/core` (latest 0.7.14). Options are camelCase.

```ts
import { tavily } from "@tavily/core";
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
const r = await tvly.search("Acme Corp internship careers", {
  searchDepth: "basic", maxResults: 5, includeDomains: ["acme.com"], includeDomainsMode: "prefer",
});
```

## 3) RDAP (domain age) and DNS-over-HTTPS (MX)

**Sources:** [about.rdap.org](https://about.rdap.org/) · [IANA RDAP bootstrap](https://data.iana.org/rdap/dns.json) · [Cloudflare DoH JSON](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/) · [Google DoH JSON](https://developers.google.com/speed/public-dns/docs/doh/json)

### RDAP

- `GET https://rdap.org/domain/example.com` returns a **302** redirect to the authoritative registry (for `.com` that's `https://rdap.verisign.com/com/v1/`). `fetch` follows redirects by default.
- Registration date: `events.find(e => e.eventAction === "registration").eventDate` (ISO, UTC). Tested: google.com → `1997-09-15T04:00:00Z`.
- Status codes: 404 means the TLD has no known RDAP server (some ccTLDs), so put the check under "Couldn't check". 429 means rate limited.
- **Rate limit: 10 requests / 10 seconds per client IP** (Cloudflare). All Vercel traffic shares IPs, so cache results.
- More robust alternative: use the IANA bootstrap file `https://data.iana.org/rdap/dns.json` yourself (map TLD → base URL, then call `{base}domain/{name}` directly).

### DNS-over-HTTPS (MX)

- Google: `GET https://dns.google/resolve?name=example.com&type=MX` (no header needed).
- Cloudflare: `GET https://cloudflare-dns.com/dns-query?name=example.com&type=MX` with the header `accept: application/dns-json`.
- Response: `Status` (0 = NOERROR, 3 = NXDOMAIN) and `Answer[].data` like `"10 mx.example.com."` (MX type = 15). No `Answer` with Status 0 means no MX record. You can also check `type=A` as the RFC 5321 fallback, and `type=TXT` for SPF.
- Neither provider publishes a hard rate limit for the JSON API (**UNVERIFIED**). Both are free with no key. Both tested live on Oct 20, 2026.

## 4) Hunter.io

**Sources:** [Pricing](https://hunter.io/pricing) · [API v2 docs](https://hunter.io/api-documentation/v2)

- **Free plan: 50 credits/month**, no rollover. Credits are shared across Domain Search, Email Finder, and Verifier.
- Credit cost: **1 credit per email returned** by Domain Search (0 if none found). The same search repeated within a billing period counts once.
- Free plan cap: `limit + offset` must be ≤ 10, otherwise you get `400 pagination_error`.
- Whether the free plan includes API access: the pricing table lists "API" as a feature, but the per-plan checkmarks didn't render in the fetch, so this is **UNVERIFIED** from the page. The docs say "Sign up to get your free API key".
- Rate limit: Domain Search allows 15 req/s and 500 req/min. Usage limit reached → `429`.
- Card: **UNVERIFIED** whether signup needs one. The Free plan is $0 and was not stated to need a card.

### Domain Search

```
GET https://api.hunter.io/v2/domain-search?domain=stripe.com&limit=1&api_key=KEY
```

You can also send the key in the `X-API-KEY` header or as `Authorization: Bearer KEY`. Params: `domain` or `company`, `limit` (default 10), `offset`, `type` (`personal|generic`), `seniority`, `department`. Response `data` includes `domain, organization, pattern` (e.g. `"{first}.{last}"`), `webmail, disposable, accept_all, emails[]`. An unknown domain still returns 200 with `pattern: null` and `emails: []`. The test key `test-api-key` returns dummy data.

### Free, credit-free helpers worth considering instead

- `GET /v2/email-insight?email=jane@acme.com` returns `pattern` (bool: Hunter knows this domain's format), `mx_records`, `webmail`, `disposable`, `gibberish`. Free and doesn't count against the quota (key optional).
- `GET /v2/domain-finder?company=Acme&api_key=KEY` maps a company name to likely domains. Free, but blocked once the monthly quota is used up.
