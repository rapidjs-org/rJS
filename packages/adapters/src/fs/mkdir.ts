// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../RuntimeAdapter.js";

export const mkdir = new RuntimeAdapter<
  (path: string, options?: {
    recursive?: boolean;
  }) => Promise<void>
>()
  .withNode(async (path: string, options = {}) => {
    const { mkdir } = (await import("node:fs")).promises;
    const { resolve } = await import("node:path");

    return mkdir(resolve(path), options);
  })
  .withDeno(async (path: string, options = {}) => {
    const { resolve } = await import("jsr:@std/path");

    return Deno.mkdir(resolve(path), options);
  })
  .compile();
