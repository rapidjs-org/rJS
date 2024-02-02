#!/usr/bin/env node


import { readFileSync } from "fs";
import { join, isAbsolute } from "path";

import "./badge-logs";
import { Args } from "../common/Args";
import { CLI } from "./CLI";
import { ProgressLine } from "./ProgressLine";


let workingDir: string = Args.parseOption("working-dir", "W").string ?? "./";
workingDir = join(isAbsolute(workingDir) ? workingDir : process.cwd(), workingDir);
try {
	process.chdir(workingDir);
} catch(err) {
	console.error(new ReferenceError(`Specified application working directory does not exist at path '${workingDir}'`));

	setImmediate(() => process.exit(1));
}


/*
 * Display help text.
 */
CLI.registerCommand("help", () => {
	console.log(
		readFileSync(join(__dirname, "./_help.txt"))
		.toString()
		.replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
	);
});


CLI.registerCommand("start", async () => {
	const progressLine: ProgressLine = new ProgressLine("Starting application").activate();

	const { Context } = await import("../common/Context");
	const proxy = await import("../proxy/api.proxy");
	
	proxy
	.default
	.on("online", () => {
		progressLine.deactivate();
		
		console.log(`Listening on #b{localhost:${Context.CONFIG.get<number>("port")}}`);
		(Context.MODE === "DEV")
		&& console.log(`Application runs #Br{${Context.MODE} mode}`);
	});
});


CLI.eval("help");