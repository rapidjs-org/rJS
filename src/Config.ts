const devConfig = {
    configNameInfix: "config"
};


import { join } from "path";
import { existsSync } from "fs";

import { MODE } from "./space/MODE";
import { PATH } from "./space/PATH";


// eslint-disable-next-line no-explicit-any
type TObject = any;


export class Config {

    private static deepMergeObj(...objs: TObject[]): TObject {
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
            source[key] = Config.deepMergeObj(target[key] as TObject, source[key] as TObject);
        }
    
        target = {
            ...target,
            ...source
        };
    
        return Config.deepMergeObj(...objs, target);
    }

    public data: TObject = { limit: {}, cache: {} };   // TODO: WIP

    constructor(name: string|string[]) {
        Object.keys(MODE)
        .filter(mode => (MODE as Record<string, boolean>)[mode])
        .concat([ "" ])
        .reverse()
        .forEach(mode => {
            name = [ name ].flat();

            let i = 0;
            let fullName: string,
                fullPath: string;
            do {
                fullName = `${name[i++]}.${devConfig.configNameInfix}${mode ? `.${mode.toLowerCase()}` : ""}.json`; // TODO: More config formats?
                fullPath = join(PATH, `${fullName}`);
            } while(!existsSync(fullPath) && (i < name.length));
            
            if(!existsSync(fullPath)) {
                return;
            }

            let fileObj;
            try {
                fileObj = require(fullPath);
            } catch(err) {
                throw SyntaxError(`Configuration file could not be parsed:\n${err.message} '${fullName}'`);
            }

            this.data = Config.deepMergeObj(this.data, fileObj);
        }); // TODO: Merge in default (later)
    }

    public mergeDefault(defaultParam: string|TObject) {
        try {
            this.data = Config.deepMergeObj(
                (typeof defaultParam === "string")
                ? require(defaultParam)
                : defaultParam
            , this.data);
        } catch(err) {
            throw SyntaxError(`Configuration file could not be parsed:\n${err.message} '${defaultParam}'`);
        }
    }

    public constrain() {
        // TODO: Elaborated constraints
        // Types, patterns, required?
    }

}