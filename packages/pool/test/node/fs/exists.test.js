import { fs } from "../../../build/mod.js";

new UnitTest("fs.exists adapter (/exists.txt)")
  .actual(fs.exists("./test/static/exists.txt"))
  .expect(true);

new UnitTest("fs.exists adapter (/not-exists.txt)")
  .actual(fs.exists("./test/static/not-exists.txt"))
  .expect(false);
