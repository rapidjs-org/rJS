import { assertEquals } from "jsr:@std/assert";

import { fs } from "../../../build/mod.js";

Deno.test("fs.readFile adapter (readFile.txt)", async () => {
  assertEquals(
    await fs.readFile("./test/static/readFile.txt"),
    "foo",
  );
});
