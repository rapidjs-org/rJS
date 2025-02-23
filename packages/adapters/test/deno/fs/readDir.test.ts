import { assertEquals } from "jsr:@std/assert";

import { fs } from "../../../build/mod.js";

Deno.test("fs.readDir adapter (/readDir-parent)", async () => {
  assertEquals(
    await fs.readDir("./test/static/readDir-parent"),
    [
      {
        isDirectory: true,
        isFile: false,
        name: "readDir-child"
      },
      {
        isDirectory: false,
        isFile: true,
        name: "readDir-parent.txt"
      }
    ]
  );
});