import { resolve } from "jsr:@std/path";
import { exists } from "jsr:@std/fs/exists";
import { assertEquals } from "jsr:@std/assert";

import { fs } from "../../../build/mod.js";

const testpath = resolve("./test/static/rm.txt");

Deno.test("fs.rm adapter (rm.txt)", async () => {
  await Deno.writeFile(testpath, new TextEncoder().encode(""));

  await fs.rm(testpath);

  assertEquals(
    await exists(testpath),
    false,
  );
});
