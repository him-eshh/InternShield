// Every weight the engine uses, in one place (prd.md > Risk Scoring). Tune here only.
// Read points as log-odds with 10 points = about twice as likely in scams as in real messages
// (research 01 > 3.1): 25 is about 5.7x, 60 about 64x. Cutoffs stay 25 / 60; a critical flag floors at 85.

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
  unsolicited: 5, // the user said they didn't apply first
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
  taskVocab: 20, // 2+ task-scam terms (like/subscribe, product boosting, set of N tasks, ...)
  untrustedCode: 15, // clone/npm/run with nothing else suspicious: a normal take-home can look like this
  hiddenCharacters: 10, // invisible or look-alike characters hid text
  hiddenCharactersMin: 3, // how many altered characters it takes
  // Links in the message (checked locally, never opened). Each kind counts once per message.
  linkLookalike: 30, // look-alike host or "<brand>-careers" off the official site; same weight as a look-alike sender
  linkPunycode: 20,
  linkRawIp: 15,
  linkGoogleForm: 10, // critical instead when the message also asks for SSN/bank data
  linkShortener: 5,
  secrecy: 20, // "don't tell your bank", "keep this from your school"
  impersonation: 30, // claims to be a university, government, or immigration office from the wrong sender
  impersonationOverlap: 10, // same, when a free-email or look-alike flag already counted the sender
  visaThreat: 25, // "your OPT status will be terminated"
  paperwork: 20, // I-9, W-4, direct deposit forms before a signed offer; critical with a fee
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

  // "How sure": how many of the 14 weighted checks could run (research 01 > 3.4)
  sureFrom: 11,
  fairlySureFrom: 7,
} as const;

/** Words that may never appear in a flag title or why line. */
export const BANNED_WORDS = /\b(?:safe|safely|safety|legit|legitimate|guaranteed?)\b/i;

/** Phrases for describeChange, keyed by flag id: "Score went up because <up>". */
export const CHANGE_REASONS: Record<string, { up?: string; down?: string }> = {
  surprise_text: { up: "this came as a surprise text", down: "it didn't come as a surprise text" },
  applied_first: { up: "you didn't apply first", down: "you applied first through an official channel" },
  no_interview: { up: "you haven't had an interview with them", down: "you've had an interview with them" },
  off_platform: { up: "they want to move hiring to a chat app", down: "you applied first, so the chat app counts for less" },
  sensitive_data: { up: "you haven't signed an offer letter yet", down: "you've signed an offer letter" },
};
