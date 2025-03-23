import { path } from "../../../build/mod.js";

new UnitTest("path.resolve adapter")
  .actual(path.join("foo", "/./bar.txt"))
  .expect("foo/bar.txt");
