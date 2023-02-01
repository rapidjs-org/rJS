import devConfig from "../_config.json";


import { join } from "path";
import { existsSync } from "fs";

import { TJSONObject } from "../_types";


export class Config {

    private static deepMergeObj(...objs: TJSONObject[]): TJSONObject {
        if(objs.length === 1) {
            return objs[0];
        }
        
        const source = objs.pop() || {};
        let target = objs.pop() || {};
    
        for(const key of (Object.keys(target).concat(Object.keys(source)))) {
            if((target[key] || {}).constructor.name !== "Object"
            || (source[key] || {}).constructor.name !== "Object") {
                // Leaf
                target[key] = source[key] || target[key];
                
                continue;
            }
            
            // Recursive
            source[key] = Config.deepMergeObj(target[key] as TJSONObject, source[key] as TJSONObject);
        }
    
        target = {
            ...target,
            ...source
        };
    
        return Config.deepMergeObj(...objs, target);
    }

    public obj: TJSONObject = { limit: {}, cache: {} };   // TODO: WIP

    constructor(name: string|string[], path: string, mode?: string) {
        [ "" ]  // Include general
        .concat(mode ? [ mode ] : [])
        .forEach(mode => {
            name = [ name ].flat();
            
            let i = 0;
            let fullName: string,
                fullPath: string;
            do {
                fullName = `${name[i++]}.${devConfig.configNameInfix}${mode ? `.${mode.toLowerCase()}` : ""}.json`; // TODO: More config formats?
                fullPath = join(path, `${fullName}`);
            } while(!existsSync(fullPath) && (i < name.length));
            
            if(!existsSync(fullPath)) {
                return;
            }

            let fileObj;
            try {
                fileObj = require(fullPath);
            } catch(err) {
                this.throwParseError(err, fullName);
            }

            this.obj = Config.deepMergeObj(this.obj, fileObj);
        }); // TODO: Merge in default (later)
    }

    private throwParseError(err: Error, path?: string) {
        throw SyntaxError(`Configuration file could not be parsed:\n${err.message}${path ? ` ${path}` : ""}`);
    }

    public mergeDefault(defaultParam: string|TJSONObject) {
        try {
            this.obj = Config.deepMergeObj(
                (typeof defaultParam === "string")
                ? require(defaultParam)
                : defaultParam
            , this.obj);
        } catch(err) {
            this.throwParseError(err);
        }
    }

    public constrain() {
        
    }

}