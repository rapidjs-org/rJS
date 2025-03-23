import { path } from "../../../build/mod.js";

new UnitTest("path.join adapter")
  .actual(path.normalize("./foo/../bar/./baz.txt"))
  .expect("bar/baz.txt");
