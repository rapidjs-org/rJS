const devConfig = {
    configNamePrefixList: [ "rapidjs", "rjs", "rapid" ]
};


import { resolve } from "path";

import { Config } from "./Config";


export const SPACE_CONFIG: Config = new Config(devConfig.configNamePrefixList);

SPACE_CONFIG.mergeDefault(resolve("./default.config.json"));

/* SPACE_CONFIG.constrain({}); */