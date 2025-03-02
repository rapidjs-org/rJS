import { path } from "../../../build/mod.js";

new UnitTest("path.resolve adapter")
  .actual(path.resolve("./foo.txt"))
  .expect(`${process.cwd()}/foo.txt`);
