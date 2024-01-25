import { Args } from "./Args";
import { Config } from "./Config";

import DEFAULT_CONFIG from "./default.config.json";


type TMode = "PROD" | "DEV";


export class Context {
	public static readonly MODE: TMode = Args.parseFlag("dev", "D")
		? "DEV"
		: "PROD";
	public static readonly CONFIG: Config = new Config("./", DEFAULT_CONFIG)
	.addDefinedConstraint("port")
	.addTypeConstraint("port", "number");
}