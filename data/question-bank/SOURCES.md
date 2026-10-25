# Question bank sources

`bank.json` holds metadata only (title, public problem URL, difficulty, topic tags, companies). No problem statements, solutions or test cases are stored. The app links out to leetcode.com for the full statement. Rebuild with `node data/question-bank/build.mjs`.

| Dataset | Used for | License | Pinned commit | Retrieved |
|---|---|---|---|---|
| https://github.com/hxu296/leetcode-company-wise-problems-2022 | Which problems each company asked (60 largest company lists, ranked by frequency) | MIT (c) 2022 Huan Xu | `33f44cb62594b13f7b3e0ec12e8f811b40fddd0d` | 2026-10-25 |
| https://github.com/newfacade/LeetCodeDataset (`data/LeetCodeDataset-v0.3.1-{train,test}.jsonl.gz`) | Difficulty and topic tags per problem (descriptions in the file are discarded by the build script) | MIT | `182cd19fd53161efd70a1ef074fe1056b659bfa3` | 2026-10-25 |

Fetched as raw files over plain HTTPS from GitHub. No LeetCode site access, no login, no API keys.

Rejected: `liquidslr/leetcode-company-wise-problems`, `snehasishroy/leetcode-companywise-interview-questions`, `krishnadey30/LeetCode-Questions-CompanyWise` (no license file, so reuse is not granted); `jobream/Leetcode-Company-Wise-Problems` (MIT but PDFs only, 2020).

Notes:
- Company lists are from May 2022; they show what was asked, not what is asked today.
- Problems without a known difficulty are dropped, so the bank is smaller than the source lists.
- "Facebook" in the data is Meta; the loader treats both names as the same company.
- Company names, problem titles and LeetCode are trademarks of their owners; this app is not affiliated with them.
