const { join } = require("path");


const PORT = 7999;


RequestTest.setCommonHost({
	port: PORT
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