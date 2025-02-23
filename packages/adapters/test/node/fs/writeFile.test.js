import { rmSync } from "fs";

import { fs } from "../../../build/mod.js";

new UnitTest("fs.writeFile adapter (writeFile.txt)")
  .actual(async () => {
    const testpath = "./test/static/writeFile.txt";

    rmSync(testpath);
    await fs.writeFile(testpath, "foo");
    
    return await fs.readFile(testpath);
  })
  .expect("foo");