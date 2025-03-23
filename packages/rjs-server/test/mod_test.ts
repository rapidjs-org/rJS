import { serve } from "../build/mod.js";

Deno.test("Emit", async () => {
     
    assertEquals(
        await readPublicFile("/foo.txt"),
        "sef",
        "/public/foo.txt is identity",
    );
});
