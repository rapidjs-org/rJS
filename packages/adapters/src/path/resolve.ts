// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../RuntimeAdapter.js";

export const resolve = new RuntimeAdapter<
  (...paths: string[]) => Promise<string>
>()
  .withNode(async (...paths: string[]) => {
    const { resolve } = await import("node:path");

    return resolve(...paths);
  })
  .withDeno(async (...paths: string[]) => {
    const { resolve } = await import("jsr:@std/path");

    return resolve(...paths);
  })
  .compile();
