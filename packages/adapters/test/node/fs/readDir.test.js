import { fs } from "../../../build/mod.js";

new UnitTest("fs.readDir adapter (/readDir-parent)")
  .actual(fs.readDir("./test/static/readDir-parent"))
  .expect([
    {
      isDirectory: true,
      isFile: false,
      name: "readDir-child"
    },
    {
      isDirectory: false,
      isFile: true,
      name: "readDir-parent.txt"
    }
  ]);