import { Command } from "../Command";
import { Args } from "../Args";
import { Dependency } from "./Dependency";
import { Printer } from "../Printer";
import { ARG_CONTEXT } from "./ARG_CONTEXT";

import * as rJSProxyAPI from "@rapidjs.org/rjs-proxy";

new Command("stop", () => {
	new Dependency("@rapidjs.org/rjs-proxy").installIfNotPresent().then(async (api) => {
		await (
			await api.require<typeof rJSProxyAPI>()
		).unbed(ARG_CONTEXT.port, Args.parseOption("hostnames", "H").string() ? ARG_CONTEXT.hostnames : null);

		Printer.global.stdout(
			`Unbedded application context ${
				ARG_CONTEXT.hostnames.length > 1 ? `[${ARG_CONTEXT.hostnames.join("|")}]` : ARG_CONTEXT.hostnames[0]
			}:${ARG_CONTEXT.port}`
		);
	});
});
