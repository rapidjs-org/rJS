import { path } from "../../../build/mod.js";

new UnitTest("path.basename adapter")
  .actual(path.basename("./foo/bar.txt"))
  .expect("bar.txt");
