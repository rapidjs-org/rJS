import { renameSync } from "fs";
import { resolve } from "path";

import { fs } from "../../../build/mod.js";

const testpath1 = resolve("./test/static/stat.txt");
const testpath2 = resolve("./test/static/stat2.txt");
const epsilon = 1e1;
const timestamp = Date.now();

renameSync(testpath1, testpath2);
renameSync(testpath2, testpath1);

new UnitTest("fs.stat adapter (foo.txt)")
  .actual(async () => {
    const modTime = (await fs.stat(testpath1)).modTime;
    return Math.abs(timestamp - modTime) < epsilon;
  })
  .expect(true);