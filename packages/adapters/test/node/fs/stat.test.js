import { renameSync } from "fs";
import { resolve } from "path";

import { fs } from "../../../build/mod.js";

const testpath1 = resolve("./test/static/stat.txt");
const testpath2 = resolve("./test/static/stat2.txt");

renameSync(testpath1, testpath2);
renameSync(testpath2, testpath1);

fs.stat(testpath1)
  .then(stats => {
    const epsilon = 1e1;
    const timestamp = Date.now();

    new UnitTest("fs.stat adapter (1) (foo.txt)")
      .actual(async () => {
        return Math.abs(timestamp - stats.modTime) < epsilon;
      })
      .expect(true);
    
    new UnitTest("fs.stat adapter (2) (foo.txt)")
      .actual(async () => stats.isFile)
      .expect(true);
    
  });