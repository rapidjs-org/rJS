const fs = require("fs");
const path = require("path");

const _util = require("./_util");


const PACKAGES_DIR_PATH = path.join(__dirname, "../packages/");
const SHARED_DIR_NAME = "shared";
const SHARED_DEPENDENCY_DIR_NAME = ".shared";


const targetPackageName = process.argv.slice(2)[0];
if(!fs.existsSync(path.join(PACKAGES_DIR_PATH, targetPackageName))) {
    throw new ReferenceError(`Package '${targetPackageName}' does not exist`);
}

const targetSharedDirPath = path.join(PACKAGES_DIR_PATH, targetPackageName, "./src", SHARED_DEPENDENCY_DIR_NAME);
fs.rmSync(targetSharedDirPath, {
    force: true,
    recursive: true
});
fs.cpSync(path.join(PACKAGES_DIR_PATH, SHARED_DIR_NAME), targetSharedDirPath, {
    recursive: true
});


_util.print([
    `Copied shared modules state to package '${targetPackageName}'.`,
    `(packages/${SHARED_DEPENDENCY_DIR_NAME} → packages/${targetPackageName}/src/${SHARED_DEPENDENCY_DIR_NAME})`
].join("\n"));