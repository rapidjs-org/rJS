// deno-lint-ignore-file
// @ts-nocheck

import type { Dirent } from "node:fs";

import { RuntimeAdapter } from "../RuntimeAdapter.js";

export type TDirent = {
  isDirectory: boolean;
  isFile: boolean;
  name: string;
};

// TODO: CWD
export const readDir = new RuntimeAdapter<
  (absoluteModulePath: string) => Promise<number>
>()
  .withNode(async (absoluteModulePath: string) => {
    const { fork } = (await import("node:child_process"));

    return new Promise((resolve, reject) => {
      const process = fork(absoluteModulePath);

      process.on("exit", (result) => {
        !result.code ? resolve() : reject(result.code);
      });
      process.on("error", reject);
    });
  })
  .withDeno(async (absoluteModulePath: string) => {
    return new Promise(async (resolve, reject) => {
      const process = Deno.spawn("deno", [ "run", absoluteModulePath ]);

      const { code } = await process.status();

      !code ? resolve() : reject(code);
    });
  })
  .compile();
