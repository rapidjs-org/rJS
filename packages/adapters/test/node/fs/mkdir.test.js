import { rmdirSync, existsSync } from "fs";
import { resolve } from "path";

import { fs } from "../../../build/mod.js";

new UnitTest("fs.mkdir adapter (/mkdir-parent/mkdir-child)")
  .actual(async () => {
    const testpath = resolve("./test/static/mkdir-parent/mkdir-child");

    rmdirSync(testpath, {
      force: true
    });

    await fs.mkdir(testpath, {
      recursive: true
    });

    return existsSync(testpath);
  })
  .expect(true);