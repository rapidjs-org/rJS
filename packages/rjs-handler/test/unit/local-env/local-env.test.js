const { LocalEnv } = require("../../../build/LocalEnv");

const env = new LocalEnv(true, __dirname);

new UnitTest("Local .env 'FOO' (override)")
.actual(env.read("FOO"))
.expect("3");

new UnitTest("Local .env 'BAR'")
.actual(env.read("BAR"))
.expect("2");