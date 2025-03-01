import { resolve } from "jsr:@std/path";
import { assertLess, assertEquals } from "jsr:@std/assert";

import { fs } from "../../../build/mod.js";

Deno.test("fs.stat adapter (foo.txt)", async () => {
  const testpath1 = resolve("./test/static/stat.txt");
  const testpath2 = resolve("./test/static/stat2.txt");
  const epsilon = 1e10;
  const timestamp = Date.now();
  
  await Deno.rename(testpath1, testpath2);
  await Deno.rename(testpath2, testpath1);

  const stats = await fs.stat(testpath1);
  assertLess(
    Math.abs(timestamp - stats.modTime),
    epsilon,
  );
  assertEquals(
    stats.isFile,
    true
  );
});