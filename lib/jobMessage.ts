// Hiring context can override a model's false negative; it never vouches for the sender.
import { cleanText } from "./scoring/unicode";

const HIRING_CONTEXT = [
  /\b(?:recruit(?:er|ers|ing|ment)|talent acquisition|hiring|internships?|job\s+(?:offers?|postings?|openings?|alerts?|opportunit(?:y|ies)|applications?|boards?))\b/i,
  /\b(?:invited?|invit(?:e|ing))\s+you\s+to\s+apply\b/i,
  /\b(?:thank(?:s| you)\s+for\s+applying|your\s+(?:(?:job|employment|recent)\s+)?application|application\s+(?:status|received|update))\b/i,
  /\b(?:employer|company)\b[^.!?\n]{0,70}\b(?:viewed|reviewed|interested in)\b[^.!?\n]{0,35}\byour\s+profile\b/i,
  /\byour\s+profile\b[^.!?\n]{0,70}\b(?:viewed|reviewed)\b[^.!?\n]{0,35}\b(?:employer|company)\b/i,
  /\b(?:schedule|scheduling|reschedule|upcoming|confirm|invitation|invite)\b[^.!?\n]{0,60}\binterview\b|\binterview\b[^.!?\n]{0,60}\b(?:schedule|scheduling|reschedule|reminder|availability)\b/i,
];
const PLATFORM = /\b(?:handshake|greenhouse|lever|workday|ashby|icims|smartrecruiters|jobvite|linkedin|indeed)\b/i;
const PLATFORM_ACTIVITY = /\b(?:apply|applications?|employers?|openings?|candidates?|careers?|interviews?|profile\s+(?:views?|viewed))\b/i;

/** Recognizes recruiting and application notices even when no job offer is present. */
export function hasJobContext(raw: string): boolean {
  const text = cleanText(raw).text;
  return HIRING_CONTEXT.some((re) => re.test(text)) || (PLATFORM.test(text) && PLATFORM_ACTIVITY.test(text));
}
