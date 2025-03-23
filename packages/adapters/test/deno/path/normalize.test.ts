import { assertEquals } from "jsr:@std/assert";

import { path } from "../../../build/mod.js";

Deno.test("path.normalize adapter", async () => {
  assertEquals(
    await path.normalize("./foo/../bar/./baz.txt"),
    "bar/baz.txt",
  );
});
