// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../../RuntimeAdapter.js";

export const rm = new RuntimeAdapter<
  (path: string, options?: {
    recursive: boolean;
  }) => Promise<string | null>
>()
  .withNode(async (path: string, options = {}) => {
    const { rm } = (await import("node:fs")).promises;
    const { resolve } = await import("node:path");
    
    return rm(resolve(process.cwd(), path), options);
  })
  .withDeno(async (path: string, options = {}) => {
    const { resolve } = await import("jsr:@std/path");
    
    return Deno.remove(resolve(Deno.cwd(), path), options);
  })
  .compile();
