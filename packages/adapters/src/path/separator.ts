// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../RuntimeAdapter.js";

export const separator = new RuntimeAdapter<
  () => Promise<string>
>()
  .withNode(async () => {
    const { sep } = await import("node:path");

    return sep;
  })
  .withDeno(async () => {
    const { SEPARATOR } = await import("jsr:@std/path");

    return SEPARATOR;
  })
  .compile();
