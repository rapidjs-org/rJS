import { path } from "../../../build/mod.js";

new UnitTest("path.separator adapter")
  .actual(async () => [ "/", "\\" ].includes(await path.separator))
  .expect(true);
