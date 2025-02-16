import { assertEquals } from "jsr:@std/assert";
import { add } from "../../build/mod.js";

Deno.test(function addTest() {
  assertEquals(add(2, 3), 5);
});
