import { assertArrayIncludes } from "jsr:@std/assert";

import { path } from "../../../build/mod.js";

Deno.test("path.separator adapter", async () => {
  assertArrayIncludes(
    [ "/", "\\" ],
    await path.separator()
  );
});
