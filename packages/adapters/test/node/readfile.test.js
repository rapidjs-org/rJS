const { readfile } = require("../../build/adapters/readfile");

new UnitTest("Readfile adapter (foo.txt)")
  .actual(readfile("./test/static/foo.txt"))
  .expect("foo");

new UnitTest("Readfile adapter (bar/baz.txt)")
  .actual(readfile("./test/static/bar/baz.txt"))
  .expect("baz");
