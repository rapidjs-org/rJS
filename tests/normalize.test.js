section("Normalization utils");

const normalize = require("../dist/utilities/normalize");

test("Normalizes uppercase file extension to common representation",
normalize.normalizeExtension(".JS")).for("js");

test("Normalizes extension without a leading dot to common representation",
normalize.normalizeExtension("txt")).for("txt");

test("Truncates module extension from path name",
normalize.truncateModuleExtension("path/file.js")).for("path/file");

test("Truncates module extension from file name",
normalize.truncateModuleExtension("file.typescript")).for("file");

test("Returns given pathname as referenced file is does not have a module extension",
normalize.truncateModuleExtension("path/file.txt")).for("path/file.txt");