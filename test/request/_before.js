const { join } = require("path");


RequestTest.setCommonHost({
	port: 7999
});


module.exports = () => {
	return new Promise(resolve => {
		global.appChild = require("child_process")
		.fork(join(__dirname, "../../debug/api/api"), {
			cwd: join(__dirname, "../../test-app/")
		});

		global.appChild.on("message", message => {
			if(message !== "online") return;
			
			resolve();
		});
	});
};