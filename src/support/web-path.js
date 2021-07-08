const config = {
	webDirName: "web"
};

const {join, dirname} = require("path");

module.exports = join(dirname(require.main.filename), config.webDirName);