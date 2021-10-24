const {join, dirname} = require("path");


const LANG_DIR_NAME = "lang";


module.exports = join(dirname(require.main.filename), LANG_DIR_NAME);