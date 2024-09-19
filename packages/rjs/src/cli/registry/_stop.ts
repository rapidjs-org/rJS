import { Command } from "../Command";
import { Args } from "../Args";
import { Dependency } from "./Dependency";
import { Printer } from "../Printer";
import { CONTEXT } from "./local.constants";

import * as rJSProxyAPI from "@rapidjs.org/rjs-proxy";

new Command("stop", () => {
	new Dependency("@rapidjs.org/rjs-proxy")
	.installIfNotPresent()
	.then(async (api) => {
		await (
			await api.require<typeof rJSProxyAPI>()
		).unbed(CONTEXT.port, Args.parseOption("hostnames", "H").string() ? CONTEXT.hostnames : null);
		
		Printer.global.stdout(
			`Unbedded application context ${
				CONTEXT.hostnames.length > 1 ? `[${CONTEXT.hostnames.join("|")}]` : CONTEXT.hostnames[0]
			}:${CONTEXT.port}`
		);
	});
});