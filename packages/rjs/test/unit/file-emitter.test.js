const { readFileSync } = require("fs");
const { FileEmitter } = require("../../build/api");

const fileEmitter = new FileEmitter({
	pluginDirPath: require("path").join(__dirname, "../../../../test-app/plugins"),
	publicDirPath: require("path").join(__dirname, "./_public")
});

new UnitTest("File emission")
.actual(async () => {
	await fileEmitter.emit();
	
	return readFileSync(
		require("path").join(__dirname, "./_public/out.txt")
	).toString();
})
.expect("O\nP1\nP2");