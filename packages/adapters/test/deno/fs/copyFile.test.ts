import { resolve } from "jsr:@std/path";
import { assertEquals } from "jsr:@std/assert";

import { fs } from "../../../build/mod.js";

Deno.test("fs.copyFile adapter (copyFile.txt to copiedFile.txt)", async () => {
  const testpath1 = resolve("./test/static/copyFile.txt");
  const testpath2 = resolve("./test/static/copiedFile.txt");

  Deno.remove(testpath2);
  
  await fs.copyFile(testpath1, testpath2);
  
  assertEquals(
    await Deno.readTextFile(testpath2),
    "foo",
  );
});