// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../../RuntimeAdapter.js";

export const writeFile = new RuntimeAdapter<
  (path: string, data: string) => Promise<string | null>
>()
  .withNode(async (path: string, data: string) => {
    const { writeFile } = (await import("node:fs")).promises;
    const { resolve } = await import("node:path");
    
    return writeFile(resolve(process.cwd(), path), data);
  })
  .withDeno(async (path: string, data: string) => {
    const { resolve } = await import("jsr:@std/path");
    
    return Deno.writeFile(resolve(Deno.cwd(), path), new TextEncoder().encode(data));
  })
  .compile();
