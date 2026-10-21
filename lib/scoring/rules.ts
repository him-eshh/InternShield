// Every weight the engine uses, in one place (prd.md > Risk Scoring). Tune here only.

export const WEIGHTS = {
  // Critical flags: any one sets the floor. Their points also count toward the sum.
  criticalFloor: 85,
  critical: 40,
  sensitiveCaution: 5, // SSN/bank/ID after a signed offer, outside chat

  // Red flags
  lookalike: 30,
  freeEmailEstablished: 25,
  freeEmailStartup: 12,
  surpriseText: 25,
  replyYes: 25,
  offPlatform: 20,
  offPlatformAbroad: 10, // employer outside the US and no money or data asked for
  noInterview: 20,
  vagueEasyPayCombo: 15,
  newDomain: 15,
  newDomainDays: 90,
  postingMismatch: 10,
  pressure: 10,
  roleAboveLevel: 5,
  fieldPattern: 8,
  noMx: 5,
  throwawayEmail: 15, // Hunter says the address is disposable; only when Hunter ran
  genericGreeting: 3,
  otherConcernEach: 2,
  otherConcernsMax: 5,

  // Good signs (negative). Total capped; never applied when a critical fired.
  officialDomain: -10,
  appliedFirst: -10,
  postingOnOfficialSite: -5,
  hiringPlatform: -5,
  goodSignCap: -20,

  // Levels
  mediumFrom: 25,
  highFrom: 60,
} as const;

/** Words that may never appear in a flag title or why line. */
export const BANNED_WORDS = /\b(?:safe|safely|safety|legit|legitimate|guaranteed?)\b/i;

/** Phrases for describeChange, keyed by flag id: "Score went up because <up>". */
export const CHANGE_REASONS: Record<string, { up?: string; down?: string }> = {
  surprise_text: { up: "this came as a surprise text", down: "it didn't come as a surprise text" },
  applied_first: { up: "you didn't apply first", down: "you applied first through an official channel" },
  no_interview: { up: "you haven't had an interview with them", down: "you've had an interview with them" },
  off_platform: {
    up: "the employer is in the US, where moving hiring to a chat app is unusual",
    down: "the employer is outside the US, where chat apps are common for work",
  },
  sensitive_data: { up: "you haven't signed an offer letter yet", down: "you've signed an offer letter" },
};
