// deno-lint-ignore-file
// @ts-nocheck

import type { Buffer } from "node:buffer";

import { RuntimeAdapter } from "../../RuntimeAdapter.js";

export const readFile = new RuntimeAdapter<
  (path: string) => Promise<string | null>
>()
  .withNode(async (path: string) => {
    const { readFile } = (await import("node:fs")).promises;
    const { resolve } = await import("node:path");
    
    const data: Buffer = await readFile(resolve(process.cwd(), path));
    return  data.toString();
  })
  .withDeno(async (path: string) => {
    const { resolve } = await import("jsr:@std/path");
    
    return await Deno.readTextFile(resolve(Deno.cwd(), path));
  })
  .compile();
