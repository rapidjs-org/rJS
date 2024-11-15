const { Directory, File } = require("../../build/api");


const directory = new Directory("virtual/", [
	new File("foo.txt", "FOO"),
	new File("bar.txt", "BAR"),
	new File("bar.txt", "BAZ"),
	new File("quux/foo.txt", "QUUX FOO"),
]);

new UnitTest("Directory nodes length")
.actual(directory.nodes.length)
.expect(4);

new UnitTest("Directory pathmap size (no path duplicates)")
.actual(directory.pathMap.size)
.expect(3);

new UnitTest("Directory .get('bar.txt')")
.actual(directory.get("bar.txt"))
.expect({
	relativePath: "bar.txt",
	name: "bar",
	extension: "txt",
	contents: "BAZ"
});

new UnitTest("Directory .get('quux/foo.txt')")
.actual(directory.get("foo.txt"))
.expect({
	relativePath: "foo.txt",
	name: "foo",
	extension: "txt",
	contents: "FOO"
});

new UnitTest("Directory .get('.') [identity]")
.actual(directory.get(".").relativePath)
.expect("virtual/");


const file = new File("virtual.js", "console.log('foo bar');");

new UnitTest("File meta")
.actual({
	name: file.name,
	extension: file.extension
})
.expect({
	name: "virtual",
	extension: "js"
});

new UnitTest("File contents")
.actual(file.contents)
.expect("console.log('foo bar');");