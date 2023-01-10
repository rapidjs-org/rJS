const devConfig = {
    configNamePrefixList: [ "rapidjs", "rjs", "rapid" ]
};


import { join } from "path";

import { Config } from "../Config";

// TODO: Re-implement
export const CONFIG: any/* Config */ = {
    data: { limit: {}, cache: {} }
}; /* new Config(devConfig.configNamePrefixList);

CONFIG.mergeDefault(join(__dirname, "./default.config.json")); */

/* CONFIG.constrain({}); */