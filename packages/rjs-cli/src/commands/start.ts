import { Command } from "../Command";
import { Args } from "../Args";
import { execFromEcosystem } from "../api";


new Command("start", () => execFromEcosystem({
    name: "proxy",
    member: "embed"
}, [
    Args.parseOption("hostname", "H").string()
]));