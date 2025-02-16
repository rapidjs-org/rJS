// deno-lint-ignore-file

import { RuntimeAdapter } from "../RuntimeAdapter";

export interface IDirEntry {
  name: string;
  absolutePath: string;
  isDirectory: boolean;
}

export const readdir = new RuntimeAdapter<
  (relativePath: string, recursive?: boolean) => Promise<IDirEntry[]>
>()
  .withNode(async (relativePath: string, recursive = true) => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    return new Promise((resolve, reject) => {
    });
  })
  .withDeno(async (relativePath: string, recursive = true) => {
    // @ts-ignore
    const path = await import("jsr:@std/path");

    // @ts-ignore
    const absolutePath: string = path.join(Deno.cwd(), relativePath);
    const entries: IDirEntry[] = [];
    // @ts-ignore
    for await (const entry of Deno.readDir(absolutePath)) {
      entries.push({
        name: entry.name,
        absolutePath: absolutePath,
        isDirectory: entry.isDirectory,
      });
    }

    return entries;
  })
  .compile();
