// deno-lint-ignore-file
// @ts-nocheck

import { RuntimeAdapter } from "../../RuntimeAdapter.js";

export const copyFile = new RuntimeAdapter<
  (sourcePath: string, targetPath: string) => Promise<void>
>()
  .withNode(async (sourcePath: string, targetPath: string) => {
    const { copyFile } = (await import("node:fs")).promises;
    const { resolve } = await import("node:path");
    
    return copyFile(resolve(process.cwd(), sourcePath), resolve(process.cwd(), targetPath));
  })
  .withDeno(async (sourcePath: string, targetPath: string) => {
    const { resolve } = await import("jsr:@std/path");
    
    return Deno.copyFile(resolve(Deno.cwd(), sourcePath), resolve(Deno.cwd(), targetPath));
  })
  .compile();