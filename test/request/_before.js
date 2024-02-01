process.chdir(require("path").join(__dirname, "../../test-app/"));

require("../../debug/app");


RequestTest.setCommonHost({
	port: 7999
});


module.exports = new Promise(resolve => {
	// TODO: Initialized notifier
	setTimeout(() => resolve(), 1500);
});