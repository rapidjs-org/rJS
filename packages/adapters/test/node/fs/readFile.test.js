import { fs } from "../../../build/mod.js";

new UnitTest("fs.readFile adapter (readFile.txt)")
  .actual(fs.readFile("./test/static/readFile.txt"))
  .expect("foo");