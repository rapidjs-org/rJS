import { Config } from "./Config";

import _config from "../_config.json";

import appConfigDefaultsObj from "./rjs.config.defaults.json";


export class AppConfig extends Config {
	constructor(path: string) {
		super(path, _config.globalConfigName, appConfigDefaultsObj);
	}
}