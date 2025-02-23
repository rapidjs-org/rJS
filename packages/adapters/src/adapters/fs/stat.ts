// deno-lint-ignore-file
// @ts-nocheck

import type { Stats } from "node:fs";

import { RuntimeAdapter } from "../../RuntimeAdapter.js";

export interface IStats {
  modTime: number;
}

export const stat = new RuntimeAdapter<
  (path: string) => Promise<IStats | null>
>()
  .withNode(async (path: string) => {
    const { stat } = (await import("node:fs")).promises;
    const { resolve } = await import("node:path");
    
    const stats: Stats = await stat(resolve(process.cwd(), path));
    return {
      modTime: Math.max(stats.ctimeMs, stats.mtimeMs)
    };
  })
  .withDeno(async (path: string) => {
    const { resolve } = await import("jsr:@std/path");

    const stats = await Deno.stat(resolve(Deno.cwd(), path));
    
    return {
        modTime: Math.max(stats.ctime.getTime(), stats.mtime.getTime())
    };
  })
  .compile();
