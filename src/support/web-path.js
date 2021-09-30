const {join, dirname} = require("path");
const {existsSync} = require("fs");

const output = require("./output");


const WEB_DIR_NAME = require("./web-config").webConfig.webDirectory;
if(WEB_DIR_NAME.match(/[<>:"/\\|?*]/)) {
    output.error(
        new SyntaxError(`'${WEB_DIR_NAME}' is not a valid directory name. Contains disallowed characters from {<, >, :, ", /, \\, ,|, ?, *}.`),
        true);
}

const WEB_DIR_PATH = join(dirname(require.main.filename), WEB_DIR_NAME);
if(!existsSync(WEB_DIR_PATH)) {
    output.error(
        new ReferenceError(`Web file directory does not exist at '${WEB_DIR_PATH}'`),
        true);
}

module.exports = WEB_DIR_PATH;