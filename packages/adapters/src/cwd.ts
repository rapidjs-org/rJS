// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "./RuntimeAdapter.js";

export const cwd = new RuntimeAdapter<
  () => string
>()
  .withNode(() => {
    return process.cwd();
  })
  .withDeno(() => {
    return Deno.cwd();
  })
  .compile();
