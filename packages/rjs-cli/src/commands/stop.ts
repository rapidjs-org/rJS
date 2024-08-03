import { Command } from "../Command";
import { Args } from "../Args";
import { Dependency } from "../Dependency";

import ProxyAPI from "@rapidjs.org/rjs-proxy";


new Command("stop", () => {
    new Dependency("@rapidjs.org/rjs-proxy")
    .installIfNotPresent()
    .then(async (api) => {
        await (await api.require<typeof ProxyAPI>())
        .unbed(Args.parseOption("port", "P").number(), Args.parseOption("hostname", "H").string() ?? "localhost");
        
        // TODO: Output
    })
    .catch(() => {
        // TODO
    })
});