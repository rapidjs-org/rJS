import { assertEquals } from "jsr:@std/assert";

import { fs } from "../../../build/mod.js";

Deno.test("fs.exists adapter (/exists.txt)", async () => {
  assertEquals(
    await fs.exists("./test/static/exists.txt"),
    true,
  );
});

Deno.test("fs.exists adapter (/not-exists.txt)", async () => {
  assertEquals(
    await fs.exists("./test/static/not-exists.txt"),
    false,
  );
});
