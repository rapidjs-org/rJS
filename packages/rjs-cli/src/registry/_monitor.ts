import { Command } from "../Command";
import { Dependency } from "./Dependency";

import rJSProxyAPI from "@rapidjs.org/rjs-proxy";
import { Printer } from "../Printer";
import { ARG_CONTEXT } from "./ARG_CONTEXT";

new Command("monitor", () => {
	new Dependency("@rapidjs.org/rjs-proxy").installIfNotPresent().then(async (api) => {
		const monitoring: rJSProxyAPI.IMonitoring = await (
			await api.require<typeof rJSProxyAPI>()
		).monitor(ARG_CONTEXT.port);

		Printer.global.stdout(Printer.format("Proxy state:".toUpperCase(), [1]));
		Printer.global.stdout(JSON.stringify(monitoring));
	});
});
