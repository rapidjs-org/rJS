import { Command } from "../Command";
import { Args } from "../Args";
import { Dependency } from "../Dependency";

import ProxyAPI from "@rapidjs.org/rjs-proxy";


new Command("start", () => {
    new Dependency("@rapidjs.org/rjs-proxy")
    .installIfNotPresent()
    .then(async (api) => {
        (await api.require<typeof ProxyAPI>())
        .embed(Args.parseOption("port", "P").number(), {
            hostnames: Args.parseOption("hostname", "H").string() ?? "localhost",   // TODO: Multiple woth comma separation
            tls: null,  // TODO
            workingDirPath: Args.parseOption("working-dir", "W").string() ?? process.cwd()
        });
    })
    .catch(() => {
        // TODO
    })
});