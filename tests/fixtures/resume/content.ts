// Made-up resume content for fixtures. Not a real person.
export interface FxLine {
  kind: "name" | "contact" | "heading" | "role" | "bullet" | "text";
  text: string;
  /** Bold lead-in for DOCX bullets, e.g. "Dashboard:" */
  lead?: string;
}

export const ONE_PAGE: FxLine[] = [
  { kind: "name", text: "Sam Rivera" },
  { kind: "contact", text: "sam.rivera@example.com | 555-0142 | Austin, TX | github.com/samrivera-demo" },
  { kind: "heading", text: "EDUCATION" },
  { kind: "role", text: "University of Texas at Austin | B.S. Information Systems | May 2027" },
  { kind: "text", text: "Relevant coursework: Databases, Statistics, Data Structures" },
  { kind: "heading", text: "EXPERIENCE" },
  { kind: "role", text: "Data Intern | Brightpath Logistics | Jun 2025 - Aug 2025" },
  { kind: "bullet", text: "Built a weekly sales dashboard in Excel that cut manual reporting time by 5 hours and gave the whole team one clear view of late shipments by carrier." },
  { kind: "bullet", text: "Cleaned and merged 3 shipment data sources with Python to fix duplicate records." },
  { kind: "bullet", text: "Presented route delay findings to a team of 8 and helped choose two new carriers." },
  { kind: "role", text: "Student Assistant | UT Library | Sep 2024 - May 2025" },
  { kind: "bullet", text: "Helped 40 students a week find research sources and book study rooms." },
  { kind: "bullet", text: "Wrote a short guide for the checkout desk that new staff still use." },
  { kind: "heading", text: "PROJECTS" },
  { kind: "role", text: "Campus Bike Share Analysis | Python, SQL | Spring 2025" },
  { kind: "bullet", text: "Queried 12,000 trip records in SQL to find the busiest stations by hour." },
  { kind: "bullet", text: "Made charts of ride patterns and shared the results with the student council." },
  { kind: "heading", text: "SKILLS" },
  { kind: "text", text: "Python, SQL, Excel, Git, Tableau" },
];

/** Long enough that a second page is needed. */
export const TWO_PAGE: FxLine[] = [
  ...ONE_PAGE.slice(0, 5),
  ...Array.from({ length: 8 }, (_, i): FxLine[] => [
    { kind: "role", text: `Analyst ${i + 1} | Northwind Demo Co | 20${20 + i} - 20${21 + i}` },
    { kind: "bullet", text: "Built a reporting tool in Excel that gave the team a clear weekly view of open orders." },
    { kind: "bullet", text: "Cleaned customer files with Python and fixed the records that did not match." },
    { kind: "bullet", text: "Presented monthly findings to the managers and wrote the follow-up notes." },
    { kind: "bullet", text: "Helped train 6 new hires on the order system during the busy season." },
    { kind: "bullet", text: "Tracked weekly numbers in a shared sheet so nobody had to ask for updates." },
  ]).flat(),
  ...ONE_PAGE.slice(5),
];
