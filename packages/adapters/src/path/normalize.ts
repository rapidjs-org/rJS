// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../RuntimeAdapter.js";

export const normalize = new RuntimeAdapter<
  (path: string) => Promise<string>
>()
  .withNode(async (path: string) => {
    const { normalize } = await import("node:path");

    return normalize(path);
  })
  .withDeno(async (path: string) => {
    const { normalize } = await import("jsr:@std/path");

    return normalize(path);
  })
  .compile();
