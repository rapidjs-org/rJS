import { assertEquals } from "jsr:@std/assert";

import { readfile } from "../../build/adapters/readfile";

Deno.test(async function testReadfile() {
  assertEquals(
    await readfile("./test/static/foo.txt"),
    "foo",
  );
});

Deno.test(async function testReadfile() {
  assertEquals(
    await readfile("./test/static/bar/baz.txt"),
    "baz",
  );
});
