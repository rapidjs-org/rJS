import { assertEquals } from "jsr:@std/assert";

import { setup } from "../../setup/serve.setup.js";

await setup();

Deno.test("http.serve adapter", async () => {
  const res = await fetch("http://localhost:7777/foo");
  const body = await res.text();
  
  assertEquals(
    res.status,
    500
  );
});
