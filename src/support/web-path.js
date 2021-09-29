const {join, dirname} = require("path");


const WEB_DIR_NAME = require("./web-config").webConfig.webDirectory;
if(WEB_DIR_NAME.match(/[<>:"/\\|?*]/)) {
    require("./output").error(
        new SyntaxError(`"${WEB_DIR_NAME}" is not a valid directory name. Contains disallowed characters from {<, >, :, ", /, \\, ,|, ?, *}.`),
        true);
}


module.exports = join(dirname(require.main.filename), WEB_DIR_NAME);