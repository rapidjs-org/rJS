#!/usr/bin/env node


import { readFileSync } from "fs";
import { join } from "path";

import { CLI } from "./CLI";
import { ProgressLine } from "./ProgressLine";
import { LogIntercept } from "../common/LogIntercept";
import { IPCServer } from "../common/IPCServer";
import { IApiEmbed, IProxyMonitor } from "../interfaces";
import { Prompt } from "./Prompt";
import * as API from "../api/api";

import { Args } from "@rapidjs.org/shared";


// TODO: General (CLI, proxy) log files?

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
	const progressLine: ProgressLine = new ProgressLine("Starting application").activate();
	const specifiedWorkingDir: string = Args.cli.parseOption("working-dir", "W").string ?? "./";
	
	// TODO: Handle EADDR ? DEV: Must be free; PROD: Embed if is rJS process, else error
	API.embed(specifiedWorkingDir)
	.then(async (api: IApiEmbed) => {
		const { Context } = await import("../common/Context");

		progressLine.deactivate();

		console.log(`Host listening on ${
			[ api.hostnames ].flat()
			.map((hostname: string) => `#b{${hostname}:${api.port}}`)
			.join(", ")
		}`);
		
		(Context.MODE === "PROD")
		? setImmediate(() => process.exit(0))
		: console.log("Application runs #Br{DEV} mode");
	})
	.catch((err: Error) => {
		progressLine.deactivate();

		console.error(err.message);
		
		setImmediate(() => process.exit(1));
	});

	// TODO: Endless wait upon too many processes (max sizing distr strategy)
});


CLI.registerCommand("stop", async () => {	
	const specifiedPort: number = Args.cli.parseOption("port", "P").number;
	const specifiedHostnames: string = Args.cli.parseOption("hostname", "H").string;

	const hostnames: string[] = (specifiedHostnames ?? "")
	.split(",")
	.filter((hostname: string) => hostname.trim().length);
	const hostnamePrintList: string = hostnames.length
	? `${
		hostnames
		.map((hostname: string) => `'${hostname}'`)
		.join(", ")
	}` : "";

	if(!specifiedPort
	&& !specifiedHostnames) {
		if(!(await Prompt.ask("No host identifiers specified. Stop all host applications?"))) return;
	} else {
		if(!specifiedPort
		&& !(await Prompt.ask(`No port specified. Stop all ${
			hostnamePrintList
		 } related hosts across all ports?`))) return;

		if(!specifiedHostnames
		&& !(await Prompt.ask(`No hostname(s) specified. Stop all port ${specifiedPort} related hosts?`))) return;
	}

	const progressLine: ProgressLine = new ProgressLine("Stopping application").activate();
	const ports: number[] = [ specifiedPort ?? IPCServer.associatedPorts() ].flat();

	API.unbed(ports, hostnames)
	.then(() => {
		const pluralS: string = (ports.length > 1) ? "s" : "";
		ports.length
		&& console.log(`Host${pluralS}${
			hostnamePrintList
		} on port${pluralS} ${
			ports.join(", ")
		} successfully stopped`);
	})
	.catch((err: unknown) => {
		progressLine.deactivate();

		throw err;
	});
});

CLI.registerCommand("monitor", async () => {
	// TODO: Single port filter?
	const progressLine: ProgressLine = new ProgressLine("Monitoring applications").activate();

	const proxyMonitorPrints: string[] = (await API.monitor())
	.map((proxyMonitor: IProxyMonitor) => {
		const statusColor: string = proxyMonitor.isAlive ? "\x1b[32m" : "\x1b[31m";

		const seconds: number = proxyMonitor.aliveTime / 1000;
		const minutes: number = seconds / 60;
		const hours: number = minutes / 60;
		const days: number = hours / 24;
		const aliveTime: string = [
			Math.floor(days),
			Math.floor(hours) % 24,
			Math.floor(minutes) % 60,
			Math.floor(seconds) % 60,
		]
		.map((segment: number, i) => (i > 0)
			? segment.toString().padStart(2, "0")
			: segment.toString())
		.join(":");

		return `\x1b[1m${statusColor}${
			!proxyMonitor.isAlive ? "STOPPED\n" : ""
		}• \x1b[22m\x1b[33m${
			proxyMonitor.port
		} \x1b[34m${
			proxyMonitor.hostnames
			.map((hostnames: string|string[]) => {
				return [ hostnames ].flat().join(", ");
			})
			.join(" | ")
		}\x1b[0m\n\x1b[2mRuntime: ${
			`${statusColor}${aliveTime}`
		}\x1b[0m`;
	});

	const separatorLine: string = `\x1b[2m${
		Array.from({
			length: Math.max(...
			proxyMonitorPrints
			.join("\n")
			.split(/\n/g)
			.map((line: string) => line.replace(/\x1b\[[^a-z]+m/gi, ""))
			.map((line: string) => line.length)
			)
		}, () => "–").join("")
	}\x1b[0m`;

	progressLine.deactivate();

	console.log(`Registered Hosts:\n${
		separatorLine
	}\n${
		proxyMonitorPrints
		.join(`\n${separatorLine}\n`)
	}\n${separatorLine}`);
});