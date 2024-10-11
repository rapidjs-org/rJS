const { Build, Directory } = require("../../build/api");

const build = new Build(require("path").join(__dirname, "../../../../test-app/src"));

new UnitTest("Basic build")
.actual(new Promise(async resolve => {
	resolve(await build.retrieveAll());
	
	new UnitTest("Basic rebuild")
	.actual(build.retrieve("./out.txt"))
	.expect({
		relativePath: "out.txt",
		name: "out",
		extension: "txt",
		contents: "O\nP1\nP2"
	});
}))
.expect(
	new Directory(
		".",
		[
			{
				relativePath: "out.txt",
				name: "out",
				extension: "txt",
				contents: "O\nP1\nP2"
			}
		]
	)
);