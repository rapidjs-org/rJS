const {join} = require("path");
const {exec, fork} = require("child_process");
const {existsSync, mkdirSync, readdirSync, copyFileSync} = require("fs");


const clientDirPath = {
	src: join(__dirname, "../src/client"),
	dest: join(__dirname, "../debug/client")
};

let debugApp;


// Run watching typescript compiler on source files directory
const compiler = exec("tsc -w --outDir ./debug", {
	cwd: join(__dirname, "../")
});
compiler.stdout.on("data", data => {
    process.stdout.write(data);
	process.stdout.write("\r\x1b[K");

	// Primitive error / no compile exit guard
	if(!data.match(/\s0\serrors\./)) {
		return;
	}

	try {
		// Copy client .js files manually (ignored by compiler)
		!existsSync(clientDirPath.dest) && mkdirSync(clientDirPath.dest);
		
		readdirSync(clientDirPath.src, {
			withFileTypes: true
		})
		.forEach(dirent => {
			copyFileSync(join(clientDirPath.src, dirent.name), join(clientDirPath.dest, dirent.name));
		});

		// Stop currently running debug application (if is running)
		if(debugApp) {
			debugApp.kill("SIGTERM");
		}

		// (Re)start debug application
		console.log("\n• DEBUG APPLICATION:\n")
		debugApp = fork(join(__dirname, "../debug:app/server"), [
			"-D",
			"-P",
			"../debug:app/"
		]);

		debugApp.on("message", stdout => {
			console.log(stdout);

			blockPeriod = false;
		});
	} catch {}	// No error log
});


function exitHandler() {
	compiler.kill("SIGTERM");
}

process.on("exit", exitHandler);
process.on("SIGINT", exitHandler);
process.on("SIGUSR1", exitHandler);
process.on("SIGUSR2", exitHandler);
process.on("uncaughtException", exitHandler);