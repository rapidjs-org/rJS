import { Args } from "../common/Args";
import { Config } from "./Config";

import DEFAULT_CONFIG from "./default.config.json";


type TMode = "PROD" | "DEV";


export class Context {
	public static MODE: TMode = Args.cli.parseFlag("dev", "D")
		? "DEV"
		: "PROD";
	public static CONFIG: Config = new Config("./", DEFAULT_CONFIG)
	.addTypeConstraint("clientCache", "number")
	.addTypeConstraint("maxClientRequests", "number")
	.addTypeConstraint("maxHeadersSize", "number")
	.addTypeConstraint("maxPayloadSize", "number")
	.addTypeConstraint("maxURILength", "number")
	.addTypeConstraint("port", "number")
	.addTypeConstraint("timeout", "number");
}