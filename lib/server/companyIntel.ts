// Company intel for resume tailoring and interview practice (v3 contract, shared; nobody edits after setup).
// Order: cache -> Wikidata (official site) -> Tavily on the official domain -> general Tavily search.
// Claims come from Groq reading the search snippets; any claim without a valid source is dropped.
// Never throws: capped, unconfigured or failed lookups return `limited: true` with whatever is known.
import { getDomain } from "tldts";
import { cacheGet, cacheSet, DAY } from "./cache";
import { callGroq } from "./groq";
import { takeIntel } from "./guard";
import { search, type Hit } from "./tavily";
import { wikidataCompany } from "./wikidata";

export type IntelKind = "interview" | "resume";
export interface IntelRequest {
  company: string;
  role?: string | null;
  kind: IntelKind;
}
export interface CompanyIntel {
  company: string;
  officialSite?: string;
  interview?: { rounds: string[]; notes: string[] };
  resume?: { emphasis: string[]; notes: string[] };
  values?: string[];
  sources: { label: string; url: string }[];
  cached: boolean;
  limited?: boolean;
}

const TTL = 7 * DAY;
const MAX_HITS = 8;
const SNIPPET_CHARS = 600;
/** People-profile and contact-scraper sites: never searched, never cited. */
export const EXCLUDED_DOMAINS = [
  "linkedin.com",
  "rocketreach.co",
  "zoominfo.com",
  "contactout.com",
  "signalhire.com",
  "apollo.io",
  "lusha.com",
  "spokeo.com",
  "whitepages.com",
  "peoplefinders.com",
  "theorg.com",
];
const excluded = (url: string) => {
  const d = getDomain(url);
  return !d || EXCLUDED_DOMAINS.includes(d);
};

const FIELDS = ["round", "interviewNote", "emphasis", "resumeNote", "value"] as const;
type Field = (typeof FIELDS)[number];
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["claims"],
  properties: {
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "text", "source"],
        properties: {
          field: { type: "string", enum: FIELDS },
          text: { type: "string" },
          source: { type: "integer" },
        },
      },
    },
  },
};

const SYSTEM = `You read web search snippets about one company and pull out short, factual claims useful to a student.
Fields: "round" (one interview stage, e.g. "Recruiter phone screen"), "interviewNote" (how they interview),
"emphasis" (what their resumes should show), "resumeNote" (resume advice they give), "value" (a stated company value).
Each claim: under 15 words, plain English, stated in the snippet, and "source" = the snippet number it came from.
Skip anything not in the snippets, any person's name, and rumors. Return {"claims": []} if nothing fits.`;

const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 140);
const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].slice(0, 6);

function shape(company: string, kind: IntelKind, officialSite: string | undefined, hits: Hit[], raw: string): CompanyIntel {
  let claims: { field: Field; text: string; source: number }[] = [];
  try {
    claims = (JSON.parse(raw) as { claims?: typeof claims }).claims ?? [];
  } catch {
    claims = [];
  }
  // Drop claims without a real source; renumber the sources actually cited.
  const kept = claims.filter((c) => FIELDS.includes(c.field) && Number.isInteger(c.source) && hits[c.source - 1] && clean(c.text ?? ""));
  const used = [...new Set(kept.map((c) => c.source))];
  const pick = (f: Field) => uniq(kept.filter((c) => c.field === f).map((c) => clean(c.text)));
  const out: CompanyIntel = {
    company,
    ...(officialSite ? { officialSite } : {}),
    sources: used.map((n) => ({ label: clean(hits[n - 1].title || getDomain(hits[n - 1].url) || "Source"), url: hits[n - 1].url })),
    cached: false,
  };
  if (kind === "interview") out.interview = { rounds: pick("round"), notes: pick("interviewNote") };
  else out.resume = { emphasis: pick("emphasis"), notes: pick("resumeNote") };
  const values = pick("value");
  if (values.length) out.values = values;
  return out;
}

export async function companyIntel({ company: rawCompany, role: rawRole, kind }: IntelRequest): Promise<CompanyIntel> {
  const company = rawCompany.trim();
  const role = rawRole?.trim() || "";
  const key = `intel:${kind}:${company.toLowerCase()}|${role.toLowerCase()}`;
  const hit = cacheGet<CompanyIntel>(key);
  if (hit) return { ...hit, cached: true };

  const limited = (officialSite?: string): CompanyIntel => ({ company, ...(officialSite ? { officialSite } : {}), sources: [], cached: false, limited: true });
  if (!process.env.TAVILY_API_KEY || !process.env.GROQ_API_KEY) return limited();
  if (!takeIntel().ok) return limited();

  const officialSite = (await wikidataCompany(company))?.officialDomain ?? undefined;
  const hits: Hit[] = [];
  if (officialSite) {
    const q = kind === "interview" ? `${company} interview process ${role}` : `${company} careers students resume ${role}`;
    const r = await search(q.trim(), { includeDomains: [officialSite], includeDomainsMode: "restrict" });
    if (r.ok) hits.push(...r.data);
  }
  if (hits.length < 3) {
    const q = kind === "interview" ? `how ${company} interviews ${role || "interns"}` : `${company} resume tips ${role}`;
    const r = await search(q.trim(), { excludeDomains: EXCLUDED_DOMAINS });
    if (r.ok) hits.push(...r.data);
  }
  const usable = hits.filter((h, i) => !excluded(h.url) && hits.findIndex((o) => o.url === h.url) === i).slice(0, MAX_HITS);
  if (!usable.length) return limited(officialSite);

  const snippets = usable.map((h, i) => `[${i + 1}] ${clean(h.title ?? "")} (${h.url})\n${(h.content ?? "").slice(0, SNIPPET_CHARS)}`).join("\n\n");
  const g = await callGroq("intel", {
    system: SYSTEM,
    user: `COMPANY: ${company}\nROLE: ${role || "intern"}\nFOCUS: ${kind}\n\nSNIPPETS:\n${snippets}`,
    schema: SCHEMA,
    maxTokens: 900,
  });
  if (!g.ok) return limited(officialSite); // not cached: try again later

  const data = shape(company, kind, officialSite, usable, g.data);
  cacheSet(key, data, TTL);
  return data;
}
