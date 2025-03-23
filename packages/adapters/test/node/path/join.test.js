import { path } from "../../../build/mod.js";

new UnitTest("path.join adapter")
  .actual(path.join("foo", "/./bar.txt"))
  .expect("foo/bar.txt");
