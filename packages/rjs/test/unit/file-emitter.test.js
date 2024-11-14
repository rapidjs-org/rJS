const { join } = require("path");
const { readFileSync } = require("fs");

const { FileEmitter } = require("../../build/api");


const PUBLIC_DIR_PATH = join(__dirname, "../_public");


const fileEmitter = new FileEmitter({
	sourceDirPath: join(__dirname, "../../../../test-app/src"),
	publicDirPath: PUBLIC_DIR_PATH
});

new UnitTest("File emission")
.actual(async () => {
	await fileEmitter.emit();
	
	return readFileSync(
		join(PUBLIC_DIR_PATH, "./out.txt")
	).toString();
})
.expect("O\nP1\nP2");