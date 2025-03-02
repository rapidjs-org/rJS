import { join } from "jsr:@std/path";
import { assertEquals } from "jsr:@std/assert";

import { emit } from "../build/mod.js";

Deno.test("Emit", async () => {
  const publicPath = join(
    import.meta.dirname!,
    "../../../integration",
    "public",
  );

  try {
    await Deno.remove(publicPath);
  } catch {}

  await emit(
    join(import.meta.dirname!, "../../../integration", "src"),
    publicPath,
  );

  assertEquals(
    !!(await Deno.stat(publicPath)),
    true,
    "/public exists",
  );
});
