import _config from "./_config.json";

process.title = `rJS ${_config.processTitle}`;

import { Dirent, readdirSync } from "fs";
import { join } from "path";

import { Command } from "./Command";
import { Printer } from "./Printer";
import { Update } from "./Update";


process.on("exit", () => {
	const PACKAGE_NAME: string = "@rapidjs.org/rjs-cli";

	Update.isAvailable(PACKAGE_NAME)
	&& new Update(PACKAGE_NAME);
	
	// TODO: Periodic update checks (try once a day/week (?))
});

process.on("uncaughtException", (err: Error) => {
	Printer.global.stderr(err, {
		replicatedMessage: true
	});
    
	process.exit(1);
});


// Dynamically load command registry definitions
function loadCmd(relativePath: string) {
	readdirSync(join(__dirname, relativePath), {
		withFileTypes: true
	})
	.filter((dirent: Dirent) => /^[a-z0-9_-]+\.js$/.test(dirent.name))
	.forEach((dirent: Dirent) => require(join(dirent.path, dirent.name)));
}

loadCmd("registry");
loadCmd("gen.registry");


// Execute targeted command handler
Command.eval();