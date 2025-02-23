// deno-lint-ignore-file
// @ts-nocheck

import type { Dirent } from "node:fs";

import { RuntimeAdapter } from "../../RuntimeAdapter.js";

export interface IDirent {
  isDirectory: boolean;
  isFile: boolean;
  name: string;
}

export const readDir = new RuntimeAdapter<
  (path: string) => Promise<IDirent[]>
>()
  .withNode(async (path: string) => {
    const { readdir } = (await import("node:fs")).promises;
    const { resolve } = await import("node:path");
    
    const files: Dirent[] = await readdir(resolve(process.cwd(), path), {
      withFileTypes: true
    });
    
    return files.map((dirent: Dirent) => {
      return {
        isDirectory: dirent.isDirectory(),
        isFile: dirent.isFile(),
        name: dirent.name
      };
    });
  })
  .withDeno(async (path: string) => {
    const { resolve } = await import("jsr:@std/path");
    
    const files: Deno.DirEntry[] = await Array.fromAsync(Deno.readDir(resolve(Deno.cwd(), path)));
    
    return files.map((dirEntry: Deno.DirEntry) => {
      return {
        isDirectory: dirEntry.isDirectory,
        isFile: dirEntry.isFile,
        name: dirEntry.name,
      };
    });
  })
  .compile();
