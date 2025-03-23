// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../RuntimeAdapter.js";

export const basename = new RuntimeAdapter<
  (path: string) => Promise<string>
>()
  .withNode(async (...paths: string[]) => {
    const { basename } = await import("node:path");

    return basename(...paths);
  })
  .withDeno(async (...paths: string[]) => {
    const { basename } = await import("jsr:@std/path");

    return basename(...paths);
  })
  .compile();
