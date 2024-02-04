#!/usr/bin/env node


import { readFileSync } from "fs";
import { isAbsolute, join } from "path";
import { fork } from "child_process";

import "./badge-logs";
import { CLI } from "./CLI";
import { ProgressLine } from "./ProgressLine";
import { Args } from "../common/Args";


setImmediate(() => CLI.eval("help"));


/*
 * Display help text.
 */
CLI.registerCommand("help", () => {
	console.log(
		readFileSync(join(__dirname, "./_help.txt"))
		.toString()
		.replace(/(\n→ )([a-z_\-]+)/g, "$1\x1b[1m$2\x1b[0m")
		.replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
	);
});


CLI.registerCommand("start", async () => {	
	let specifiedWorkingDir: string = Args.parseOption("working-dir", "W").string ?? "./";
	specifiedWorkingDir = isAbsolute(specifiedWorkingDir)
						? specifiedWorkingDir
						: join(process.cwd(), specifiedWorkingDir)
	try {
		process.chdir(specifiedWorkingDir);
	} catch {
		throw new ReferenceError(`Specified application working directory does not exist at path '${specifiedWorkingDir}'`);
	}

	const { Context } = await import("../common/Context");
	
	const progressLine: ProgressLine = new ProgressLine("Starting application").activate();

	const displayListeningMessage = async () => {
		console.log(`Listening on #b{localhost:${
			Context.CONFIG.get<number>("port")
		}}`);
	};
	
	// TODO: Handle EADDR ? DEV: Must be free; PROD: Embed if is rJS process, else error

	if(Context.MODE === "DEV") {
		(await import("../proxy/api.proxy"))
		.start(Context.CONFIG.get<number>("port"), true)
		.then(() => {
			progressLine.deactivate();

			displayListeningMessage();
			console.log(`Application runs #Br{${Context.MODE} mode}`);
		});

		return;
	}
	
	const detachedChild = fork(join(__dirname, "../proxy/api.proxy"), {
		cwd: process.cwd(),
		detached: true,
		silent: true
	});

	process.on("exit", () => progressLine.deactivate());
	process.on("SIGINT", () => detachedChild.kill());
	
	detachedChild.on("message", (message: string) => {	// TODO: Already running?
		if(message !== "online") return;

		progressLine.deactivate();

		displayListeningMessage();
		
		setImmediate(() => process.exit(0));
	});

	detachedChild.stderr.on("data", (data: Buffer) => {
		progressLine.deactivate();

		console.error(data.toString());

		detachedChild.kill();

		setImmediate(() => process.exit(1));
	});
	
	detachedChild.send(Context.CONFIG.get<number>("port"));
});