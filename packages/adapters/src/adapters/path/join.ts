// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../../RuntimeAdapter.js";

export const join = new RuntimeAdapter<
  (...paths: string[]) => string
>()
  .withNode(async (...paths: string[]) => {
    const { join } = await import("node:path");
    
    return join(...paths);
  })
  .withDeno(async (...paths: string[]) => {
    const { join } = await import("jsr:@std/path");
    
    return join(...paths);
  })
  .compile();
