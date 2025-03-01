// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../../RuntimeAdapter.js";

export const exists = new RuntimeAdapter<
  (path: string) => Promise<boolean>
>()
  .withNode(async (path: string) => {
    const { stat } = (await import("node:fs")).promises;
    const { resolve } = await import("node:path");
    
    try {
      await stat(resolve(process.cwd(), path));
    } catch(err) {
      if((err ?? {}).code === "ENOENT") return false;

      throw err;
    }
    return true;
  })
  .withDeno(async (path: string) => {
    const { resolve } = await import("jsr:@std/path");

    try {
      await Deno.stat(resolve(Deno.cwd(), path));
    } catch(err) {
      if(err instanceof Deno.errors.NotFound) return false;
      
      throw err;
    }
    return true;
  })
  .compile();
