const devConfig = {
    configNamePrefixList: [ "rapidjs", "rjs", "rapid" ]
};


import { join } from "path";

import { Config } from "./Config";


export const SPACE_CONFIG: Config = new Config(devConfig.configNamePrefixList);

SPACE_CONFIG.mergeDefault(join(__dirname, "./default.config.json"));

/* SPACE_CONFIG.constrain({}); */