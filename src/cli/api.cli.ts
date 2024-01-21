#!/usr/bin/env node


import { readFileSync } from "fs";
import { join } from "path";

import { Args } from "../common/Args";
import { CLI } from "./CLI";


/*
 * Display help text.
 */
CLI.registerCommand("help", () => {
	console.log(
		String(readFileSync(join(__dirname, "./_help.txt")))
		.replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
	);
});


CLI.eval();