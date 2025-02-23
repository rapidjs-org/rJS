import { writeFileSync, existsSync } from "fs";
import { resolve } from "path";

import { fs } from "../../../build/mod.js";

const testpath = resolve("./test/static/rm.txt");

new UnitTest("fs.rm adapter (rm.txt)")
  .actual(async () => {
    writeFileSync(testpath, "");

    await fs.rm(testpath);
    
    return existsSync(testpath);
  })
  .expect(false);