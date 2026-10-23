// Strict JSON schema matching lib/types Facts (spec.md > Data Model > Facts, Token Budget).
// All properties required, additionalProperties false, nullables via type arrays / anyOf, no descriptions.
const str = { type: "string" } as const;
const nstr = { type: ["string", "null"] } as const;
// maxLength/maxItems are not confirmed for Groq strict mode (api-facts.md); extract.ts enforces 200 chars / 3 items.
const quote = str;

function obj(properties: Record<string, unknown>) {
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false } as const;
}
const orNull = (schema: unknown) => ({ anyOf: [schema, { type: "null" }] });
const list = (items: unknown) => ({ type: "array", items });

export const ASK_KINDS = [
  "pay_fee",
  "buy_equipment",
  "deposit_check",
  "gift_cards",
  "crypto_or_task_deposit",
  "reship_or_forward",
  "run_code_or_install",
  "money_wrong_way",
  "sensitive_data",
  "reply_yes",
  "other",
] as const;

export const INTERVIEW_STATUSES = ["mentioned", "none_hired_directly", "unclear"] as const;

const quoted = obj({ value: str, quote });
const quoteOnly = obj({ quote });

export const EXTRACT_SCHEMA = obj({
  isJobMessage: { type: "boolean" },
  company: orNull(quoted),
  department: nstr,
  role: orNull(quoted),
  pay: orNull(quoted),
  sender: obj({ name: nstr, email: nstr, phone: nstr }),
  asks: list(obj({ kind: { type: "string", enum: [...ASK_KINDS] }, quote })),
  offPlatform: orNull(obj({ app: str, quote })),
  pressure: list(quoteOnly),
  interview: obj({ status: { type: "string", enum: [...INTERVIEW_STATUSES] }, quote: nstr }),
  dutiesVague: orNull(quoteOnly),
  noExperienceNeeded: orNull(quoteOnly),
  employerCountryHint: nstr,
  otherConcerns: list(obj({ text: str, quote })),
});
