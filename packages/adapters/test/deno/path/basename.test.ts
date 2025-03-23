import { assertEquals } from "jsr:@std/assert";

import { path } from "../../../build/mod.js";

Deno.test("path.basename adapter", async () => {
  assertEquals(
    await path.basename("./foo/bar.txt"),
    "bar.txt",
  );
});
