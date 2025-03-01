import { join } from "path";

import { emit } from "../../build/mod.js";

emit(
    join(import.meta.dirname, "src"),
    join(import.meta.dirname, "public")
).then(() => {
    console.log("File emit done.");
});