// deno-lint-ignore-file
// @ts-nocheck

import type { Stats } from "node:fs";

import { RuntimeAdapter } from "../../RuntimeAdapter.js";

export type TStats = {
  isDirectory: boolean;
  isFile: boolean;
  modTime: number;
};

export const stat = new RuntimeAdapter<
  (path: string) => Promise<TStats | null>
>()
  .withNode(async (path: string) => {
    const { stat } = (await import("node:fs")).promises;
    const { resolve } = await import("node:path");
    
    const stats: Stats = await stat(resolve(process.cwd(), path));
    return {
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      modTime: Math.max(stats.ctimeMs, stats.mtimeMs)
    };
  })
  .withDeno(async (path: string) => {
    const { resolve } = await import("jsr:@std/path");

    const stats = await Deno.stat(resolve(Deno.cwd(), path));
    
    return {
      isDirectory: stats.isDirectory,
      isFile: stats.isFile,
      modTime: Math.max(stats.ctime.getTime(), stats.mtime.getTime())
    };
  })
  .compile();
