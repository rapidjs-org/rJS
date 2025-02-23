import { assertEquals } from "jsr:@std/assert";

import { path } from "../../../build/mod.js";

Deno.test("path.join adapter", async () => {
  assertEquals(
    await path.join("foo", "/./bar.txt"),
    "foo/bar.txt"
  );
});