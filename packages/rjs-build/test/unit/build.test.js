const { Build, Filemap } = require("../../build/api");

const build = new Build(require("path").join(__dirname, "../../../../test-app/plugins"));

new UnitTest("Basic build")
.actual(new Promise(async resolve => {
	resolve(await build.retrieveAll());

	new UnitTest("Basic rebuild")
	.actual(build.retrieve("./out.txt", {
		option1: "O2"
	}))
	.expect({
		relativePath: "out.txt",
		contents: "O2\nP1\nP2"
	});
}))
.expect(new Filemap([
	{
		relativePath: "out.txt",
		contents: "O\nP1\nP2"
	}
]));