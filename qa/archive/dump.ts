import { writeFileSync } from "node:fs";
import { EXAMPLES } from "../../lib/examples";
writeFileSync("qa/examples.json", JSON.stringify(EXAMPLES, null, 2));
