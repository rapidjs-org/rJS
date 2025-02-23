import { resolve } from "jsr:@std/path";
import { assertEquals } from "jsr:@std/assert";

import { fs } from "../../../build/mod.js";

Deno.test("fs.writeFile adapter (writeFile.txt)", async () => {
  const testpath = "./test/static/writeFile.txt";

  await Deno.remove(resolve(Deno.cwd(), testpath));
  await fs.writeFile(testpath, "foo");
  
  assertEquals(
    await fs.readFile(testpath),
    "foo",
  );
});