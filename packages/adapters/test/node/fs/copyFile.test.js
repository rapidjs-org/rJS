import { readFileSync, rmSync } from "fs";
import { resolve } from "path";

import { fs } from "../../../build/mod.js";

new UnitTest("fs.readFile adapter (readFile.txt)")
  .actual(async () => {
    const testpath1 = resolve("./test/static/copyFile.txt");
    const testpath2 = resolve("./test/static/copiedFile.txt");

    rmSync(testpath2, {
      force: true,
    });

    await fs.copyFile(testpath1, testpath2);

    return readFileSync(testpath2).toString();
  })
  .expect("foo");
