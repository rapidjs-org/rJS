import { assertEquals } from "jsr:@std/assert";

import { path } from "../../../build/mod.js";

Deno.test("path.join adapter", async () => {
  assertEquals(
    await path.resolve("./foo.txt"),
    `${Deno.cwd()}/foo.txt`
  );
});
