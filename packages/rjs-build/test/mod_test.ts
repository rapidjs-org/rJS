import { join } from "jsr:@std/path";
import { assertEquals } from "jsr:@std/assert";

import { emit } from "../build/mod.js";

const SRC_PATH = join(
  import.meta.dirname!,
  "../../../integration",
  "src",
);
const PUB_PATH = join(
  import.meta.dirname!,
  "../../../integration",
  "public",
);

const emittedFileExists = async (path: string) => {
  try {
    await Deno.stat(join(PUB_PATH, path));
  } catch (err) {
    if(!(err instanceof Deno.errors.NotFound)) throw err;

    return false;
  }

  return true;
};

const readEmittedFile = (path: string) => {
  return (new TextDecoder("utf-8"))
    .decode(Deno.readFileSync(join(PUB_PATH, path)));
};

Deno.test("Emit", async () => {
  try { Deno.removeSync(PUB_PATH, { recursive: true }); } catch {}

  assertEquals(
    await emittedFileExists("."),
    false,
    "/public does exist",
  );

  await emit(SRC_PATH, PUB_PATH);

  assertEquals(
    await emittedFileExists("."),
    true,
    "/public does not exists",
  );

  await new Promise(resolve => setTimeout(resolve, 0));

  assertEquals(
    await emittedFileExists("/foo.txt"),
    true,
    "/identity/foo.txt → /foo.txt was not emitted",
  );

  assertEquals(
    await readEmittedFile("/foo.txt"),
    "foo",
    "/foo.txt is not identity",
  );

  assertEquals(
    await emittedFileExists("/_bar.txt"),
    false,
    "/identity/_bar.txt → /_bar.txt was emitted (despite private)",
  );
});
