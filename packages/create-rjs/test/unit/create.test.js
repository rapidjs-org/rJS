const { join } = require("path");
const { existsSync, rmSync } = require("fs");

const { create } = require("../../build/api");


process.chdir(join(__dirname));


new UnitTest("Create from known template")
.actual(async () => {
    const targetPath = join(__dirname, "min");

	await create("min");

    const result = existsSync(targetPath);
    
    rmSync(targetPath, {
        force: true,
        recursive: true
    }); 

    return result;
})
.expect(true);

new UnitTest("Create from unknown template")
.actual(async () => create("non-existing"))
.error("Unknown template 'non-existing'", SyntaxError);