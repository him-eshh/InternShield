// Domain lists shared by lib/scoring and lib/server. Owned by the orchestrator.

export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com", "hotmail.com", "live.com",
  "msn.com", "aol.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "gmx.com",
  "gmx.net", "mail.com", "zoho.com", "yandex.com", "yandex.ru", "qq.com", "163.com", "tutanota.com",
]);

/** Applicant-tracking / hiring platforms that send mail or host postings for employers. */
export const HIRING_PLATFORM_DOMAINS = new Set([
  "greenhouse.io", "lever.co", "myworkdayjobs.com", "workday.com", "ashbyhq.com", "smartrecruiters.com",
  "icims.com", "jobvite.com", "bamboohr.com", "joinhandshake.com", "taleo.net", "successfactors.com",
]);

/** Job boards: never treated as a company's official site. */
export const JOB_BOARD_DOMAINS = new Set([
  "linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com", "monster.com", "simplyhired.com",
  "joinhandshake.com", "wellfound.com", "builtin.com", "dice.com", "careerbuilder.com", "levels.fyi",
]);

/** Domains passed to Tavily includeDomains for the posting search (plus the official domain). */
export const POSTING_SEARCH_DOMAINS = [
  "boards.greenhouse.io", "job-boards.greenhouse.io", "jobs.lever.co", "myworkdayjobs.com", "jobs.ashbyhq.com",
];
