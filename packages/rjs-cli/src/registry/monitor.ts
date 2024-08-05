import { Command } from "../Command";
import { Args } from "../Args";
import { Dependency } from "../Dependency";

import ProxyAPI from "@rapidjs.org/rjs-proxy";


new Command("monitor", () => {
    new Dependency("@rapidjs.org/rjs-proxy")
    .installIfNotPresent()
    .then(async (api) => {
        const monitoring: ProxyAPI.IMonitoring = await (await api.require<typeof ProxyAPI>())
        .monitor(Args.parseOption("port", "P").number());
        
        // TODO: Output
    })
    .catch(() => {
        // TODO
    })
});