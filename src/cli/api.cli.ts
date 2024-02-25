#!/usr/bin/env node


import { readFileSync } from "fs";
import { join } from "path";

import { CLI } from "./CLI";
import { ProgressLine } from "./ProgressLine";
import { Args } from "../common/Args";
import { embed, unbed } from "../api/api";
import { LogIntercept } from "../common/LogIntercept";
import { IPCServer } from "../common/IPCServer";
import { IProxyMonitor } from "../interfaces";


function handleBubblingError(err: Error) {
	console.error(err);
}
process.on("uncaughtException", handleBubblingError);
process.on("unhandledRejection", handleBubblingError);


new LogIntercept()
.onErr((message: string) => {
	return `\x1b[31m${
		message
		.trim()
		.replace(/(\x1b\[[^m]+m)/g, "$1\x1b[31m")
		.replace(/^[A-Za-z]*Error: /, "")
	}\x1b[0m\n`;
})
.onBoth((message: string) => {
	return `\x1b[1m\x1b[3m\x1b[48;2;255;254;173m ${
		"\x1b[38;2;255;97;97mr"
	}${
		"\x1b[38;2;54;48;48mJS"
	} \x1b[0m ${
		message
		.replace(/\n(?! *$)/g, `\n${Array.from({ length: 3 + 2 + 1 }, () => " ").join("")}`)
		.replace(/ +$/, "")
	}`;
});


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
	const specifiedWorkingDir: string = Args.cli.parseOption("working-dir", "W").string ?? "./";
	const progressLine: ProgressLine = new ProgressLine("Starting application").activate();

	process.on("exit", () => progressLine.deactivate());
	
	// TODO: Handle EADDR ? DEV: Must be free; PROD: Embed if is rJS process, else error
	embed(specifiedWorkingDir)
	.then(async (port: number) => {
		const { Context } = await import("../common/Context");
		progressLine.deactivate();

		console.log(`Host listening on #b{localhost:${port}}`);
		
		(Context.MODE === "PROD")
		? setImmediate(() => process.exit(0))
		: console.log(`Application runs #Br{DEV} mode`);
	})
	.catch((err: Error) => {
		progressLine.deactivate();

		console.error(err.message);
		
		setImmediate(() => process.exit(1));
	});
});


CLI.registerCommand("stop", async () => {
	const port: number = Args.cli.parseOption("port", "P").number;
	const hostnames: string[] = (Args.cli.parseOption("hostname", "H").string ?? "").split(",");
	// TODO: Unknown
	unbed(port, hostnames)
	.then(() => {
        console.log("#r{Host successfully unregistered}");
	})
	.catch((err: Error) => {
		console.error((err instanceof Error) ? err.message : err);
		
		setImmediate(() => process.exit(1));
	});
});


CLI.registerCommand("stopall", async () => {
	const proxiedPorts: number[] = IPCServer.associatedPorts();
	if(!proxiedPorts.length) {
		console.error("No proxy registered at the moment");

		return;
	}
	
	let hasError: boolean = false;
	for(let i = 0; i < proxiedPorts.length; i++) {
		try {
			await unbed(proxiedPorts[i])
		} catch(err: unknown) {
			console.error((err as Error).message);

			hasError = true;
		}
	}
	
	if(!hasError) {
		console.log("#r{All hosts successfully unregistered}");

		return;
	}

	console.error("Erroneous unregistration of hosts (see above)");

	process.exit(1);
});


CLI.registerCommand("monitor", async () => {
	// TODO: Single port filter?
	const proxiedPorts: number[] = IPCServer.associatedPorts();
	if(!proxiedPorts.length) {
		console.error("No proxy registered at the moment");

		return;
	}
	
	const proxyMonitors: IProxyMonitor[] = [];
	for(let i = 0; i < proxiedPorts.length; i++) {
		try {
			proxyMonitors.push((await IPCServer.message(proxiedPorts[i], "ping")) as IProxyMonitor);
		} catch(err: unknown) {
			// TODO: Spot erroneous proxy (?)
		}
	}
	
	console.log(`Listening proxies:\n${
		proxyMonitors
		.map((proxyMonitor: IProxyMonitor) => JSON.stringify(proxyMonitor))
		.join("\n")
	}`);
});