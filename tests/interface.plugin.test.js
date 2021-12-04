const naming = require("../dist/interface/plugin/naming");

test("Dervies name of plug-in by local dependency reference",
naming.getNameByReference("@scope/name")).for("@scope/name");

test("Dervies name of plug-in by local path reference",
naming.getNameByReference("../test/plugin.js")).for("plugin");