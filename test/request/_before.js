RequestTest.setCommonHost({
	port: 7999
});


module.exports = () => {
	return new Promise(resolve => {
		require("child_process")
		.fork(require("path").join(__dirname, "./_APP"))
		.on("message", message => {
			if(message !== "online") return;
			resolve();
		});
	});
};