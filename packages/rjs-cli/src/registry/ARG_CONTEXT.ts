import { Args } from "../Args";

export const ARG_CONTEXT = {
	hostnames: (Args.parseOption("hostnames", "H").string() ?? "localhost").split(/,/),
	port: Args.parseOption("port", "P").number() ?? 443
};
