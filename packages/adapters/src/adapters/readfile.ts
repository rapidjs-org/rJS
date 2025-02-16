// deno-lint-ignore-file

import type { Buffer } from "node:buffer";

import { RuntimeAdapter } from "../RuntimeAdapter";

export const readfile = new RuntimeAdapter<
  (relativePath: string) => Promise<string | null>
>()
  .withNode(async (relativePath: string) => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    return new Promise((resolve, reject) => {
      fs.readFile(
        path.join(process.cwd(), relativePath),
        (err, data: Buffer) => {
          err
            ? (err?.code === "EEXIST") ? resolve(null) : reject(err)
            : resolve(data.toString());
        },
      );
    });
  })
  .withDeno(async (relativePath: string) => {
    // @ts-ignore
    const path = await import("jsr:@std/path");

    try {
      // @ts-ignore
      return await Deno.readTextFile(path.join(Deno.cwd(), relativePath));
    } catch (err) {
      // @ts-ignore
      if (err instanceof Deno.errors.NotFound) return null;
      throw err;
    }
  })
  .compile();
