import _config from "./_config.json";

process.title = `rJS ${_config.processTitle}`;

import { Dirent, readFileSync, readdirSync } from "fs";
import { join } from "path";

import { Command } from "./Command";
import { Printer } from "./Printer";


process.on("uncaughtException", (err: Error) => {
	Printer.global.stderr(err, {
		replicatedMessage: true
	});
    
	process.exit(1);
});


new Command("help", () => {
    Printer.global.stdout(readFileSync(join(__dirname, "../../cli.help.txt")).toString());

    process.exit(0);
});


// Dynamically load command registry definitions
readdirSync(join(__dirname, "./commands/"), {
	withFileTypes: true
})
.filter((dirent: Dirent) => /\.js$/.test(dirent.name))
.forEach((dirent: Dirent) => require(join(dirent.path, dirent.name)));


// Execute targeted command handler
Command.eval();