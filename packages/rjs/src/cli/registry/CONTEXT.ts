import { Args } from "../Args";

export const CONTEXT = {
	devMode: Args.parseFlag("dev", "D"),
	hostnames: (Args.parseOption("hostnames", "H").string() ?? "localhost").split(/,/),
	port: Args.parseOption("port", "P").number() ?? 443
};