const fs = require("fs");
const path = require("path");

const _util = require("./_util");


const PACKAGES_DIR_PATH = path.join(__dirname, "../packages/");
const SHARED_DIR_PATH = path.join(PACKAGES_DIR_PATH, "shared");
const SHARED_DEPENDENCY_DIR_NAME = ".shared";
const TARGET_PACKAGE_NAME = process.argv.slice(2)[0];
if(!fs.existsSync(path.join(PACKAGES_DIR_PATH, TARGET_PACKAGE_NAME))) {
    throw new ReferenceError(`Package '${TARGET_PACKAGE_NAME}' does not exist`);
}
const TARGET_SHARED_DIR_PATH = path.join(PACKAGES_DIR_PATH, TARGET_PACKAGE_NAME, "./src", SHARED_DEPENDENCY_DIR_NAME);

fs.rmSync(TARGET_SHARED_DIR_PATH, {
    force: true,
    recursive: true
});
fs.cpSync(SHARED_DIR_PATH, TARGET_SHARED_DIR_PATH, {
    recursive: true
});
fs.readdirSync(TARGET_SHARED_DIR_PATH, {
    withFileTypes: true,
    recursive: true
}).forEach(dirent => {
    fs.chmodSync(path.join(dirent.parentPath, dirent.name), "444");
});


_util.print([
    `Copied shared modules state to package '${TARGET_PACKAGE_NAME}'.`,
    `(packages/${SHARED_DEPENDENCY_DIR_NAME} → packages/${TARGET_PACKAGE_NAME}/src/${SHARED_DEPENDENCY_DIR_NAME})`
].join("\n"));