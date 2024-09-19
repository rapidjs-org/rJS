import { Args } from "../Args";
import { Command } from "../Command";
import { Printer } from "../Printer";
import { Dependency } from "./Dependency";
import { activePorts } from "./util";

import * as rJSProxyAPI from "@rapidjs.org/rjs-proxy";

new Command("monitor", () => {
	new Dependency("@rapidjs.org/rjs-proxy")
	.installIfNotPresent()
	.then(async (api) => {
		const contextPort: number = Args.parseOption("port", "P").number();
		const proxiedPorts: number[] = contextPort
			? [ contextPort ]
			: activePorts(rJSProxyAPI.SOCKET_LOCATION);
		
		if(!proxiedPorts.length) {
			throw new RangeError("No proxies running.");
		}
		
		const lines: string[] = [];
		for(const port of proxiedPorts) {
			const monitoring: rJSProxyAPI.IMonitoring = await (
				await api.require<typeof rJSProxyAPI>()
			).monitor(port);
			
			lines.push(`${
				Printer.format(":", [ 2 ])
			}${
				Printer.format(port.toString(), [ 36 ])
			}${
				" ".repeat(6 - port.toString().length)
			}${
				monitoring.proxiedHostnames
				.map((hostnames: string|string[]) => Printer.format([ hostnames ].flat().join("|"), [ 1, 34 ]))
				.join(", ")
			}`);
		}	// Monitoring: + working dir
		Printer.global.stdout(Printer.format(` PROXY STATE\n${lines.join("\n")}`, [ 1 ]));
	});
});
