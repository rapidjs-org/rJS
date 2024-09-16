import { readdirSync, Dirent } from "fs";

import { Command } from "../Command";
import { Dependency } from "./Dependency";
import { Printer } from "../Printer";

import * as rJSProxyAPI from "@rapidjs.org/rjs-proxy";
import { activePorts } from "./activePorts";

new Command("stopall", () => {
	new Dependency("@rapidjs.org/rjs-proxy").installIfNotPresent().then(async (api) => {
		const proxiedPorts: number[] = activePorts(rJSProxyAPI.SOCKET_LOCATION);

		if(!proxiedPorts.length) {
			throw new RangeError("No proxies running.");
		}
		
		proxiedPorts
		.forEach(async (port: number) => {
			await (
				await api.require<typeof rJSProxyAPI>()
			).unbed(port);
		});

		Printer.global.stdout(`All proxies stopped (${
			proxiedPorts.map((port: number) => `:${port}`).join(", ")
		})`);
	});
});