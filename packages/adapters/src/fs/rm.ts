// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../RuntimeAdapter.js";

export const rm = new RuntimeAdapter<
  (path: string, options?: {
    recursive: boolean;
  }) => Promise<string | null>
>()
  .withNode(async (path: string, options = {}) => {
    const { stat, rm, rmdir } = (await import("node:fs")).promises;
    const { resolve } = await import("node:path");

    const absolutePath: string = resolve(process.cwd(), path);
    return (await stat(absolutePath)).isDirectory()
      ? rmdir(absolutePath, options)
      : rm(absolutePath, options);
  })
  .withDeno(async (path: string, options = {}) => {
    const { resolve } = await import("jsr:@std/path");

    return Deno.remove(resolve(Deno.cwd(), path), options);
  })
  .compile();
