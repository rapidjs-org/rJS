import { resolve } from "jsr:@std/path";
import { assertEquals } from "jsr:@std/assert";

import { fs } from "../../../build/mod.js";

Deno.test("fs.mkdir adapter (/mkdir-parent/mkdir-child)", async () => {
  const testpath = resolve("./test/static/mkdir-parent/mkdir-child");
  
  await Deno.remove(testpath);

  await fs.mkdir(testpath, {
    recursive: true
  });

  assertEquals(
    !!(await Deno.lstat(testpath)),
    true
  );
});