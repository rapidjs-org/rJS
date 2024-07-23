import * as rJS_core from "@rapidjs.org/core";

import APP_CONFIG_DEFAULTS from "./app.config.defaults.json";


export class AppConfig extends rJS_core.Config {
	constructor(path: string) {
		super("config", path);

		this
        .declareProperty("maxClientRequestsPerMin",
        	rJS_core.ConfigConstraint.NUMBER, APP_CONFIG_DEFAULTS["maxClientRequestsPerMin"])
        .declareProperty("maxRequestURLLength",
        	rJS_core.ConfigConstraint.NUMBER, APP_CONFIG_DEFAULTS["maxRequestURLLength"])
        .declareProperty("maxRequestHeadersLength",
        	rJS_core.ConfigConstraint.NUMBER, APP_CONFIG_DEFAULTS["maxRequestHeadersLength"])
        .declareProperty("maxRequestBodyLength",
        	rJS_core.ConfigConstraint.NUMBER, APP_CONFIG_DEFAULTS["maxRequestBodyLength"]);
	}
}