import { Args } from "./Args";
import { Config } from "./Config";
import DEFAULT_CONFIG from "./default.config.json";
export class Context {
}
Context.MODE = Args.cli.parseFlag("dev", "D")
    ? "DEV"
    : "PROD";
Context.CONFIG = new Config("./", DEFAULT_CONFIG)
    .addTypeConstraint("clientCache", "number")
    .addTypeConstraint("maxClientRequests", "number")
    .addTypeConstraint("maxHeadersSize", "number")
    .addTypeConstraint("maxPayloadSize", "number")
    .addTypeConstraint("maxURILength", "number")
    .addTypeConstraint("port", "number")
    .addTypeConstraint("timeout", "number");
