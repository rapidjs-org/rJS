const devConfig = {
    configNamePrefixList: [ "rapidjs", "rjs", "rapid" ]
};


import { join } from "path";

import { Config } from "./Config";

// TODO: Re-implement
export const SPACE_CONFIG: any/* Config */ = {
    data: { limit: {} }
}; /* new Config(devConfig.configNamePrefixList);

SPACE_CONFIG.mergeDefault(join(__dirname, "./default.config.json")); */

/* SPACE_CONFIG.constrain({}); */