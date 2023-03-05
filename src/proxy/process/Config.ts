import _config from "../../_config.json";


import { join } from "path";
import { existsSync } from "fs";

import { TJSONObject } from "../../_types";

import { EmbedContext } from "../EmbedContext";


/**
 * Interface encoding type-wise value resolve functionality
 * for case-dependent interpretation of configurations.
 */
interface ITypeResolveInterface {
    bool: () => boolean;
    number: () => number;
    string: () => string;
}


/*
 * List of configuration file specifiers applicable for the
 * read and parse process (merged) in respect to the current
 * runtime context. Specifiers contain the empty word for the
 * default config as well as all active runtime mode names
 * prefixed with a separating dot (mind order).
 * rjs.<config-name>(.<specifier>)?.json
 */
const applicableSpecifiers: string[] = [ "" ]
.concat(
    Object.entries(EmbedContext.global.mode)
    .filter((entry: [ string, boolean ]) => entry[1])
    .map((entry: [ string, boolean ]) => `.${entry[0]}`)
);


/**
 * Class representing a concrete server application
 * configuration for a specific purpose based on a
 * related file in its path. Provides static access to
 * the common configurations in the core.
 */
export class Config {

    /**
     * Deep merge objects for left-associative taget override.
     * @param objs Arbitrary amount of objects to merge
     * @returns 
     */
    private static deepMergeObj(...objs: TJSONObject[]): TJSONObject {
        if(!objs.length) return null;

        if(objs.length === 1) return objs[0];
        
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

    /*
     * Objecified effective and possibly consolidated
     * configuration file contents.
     */
    private obj: TJSONObject;

    constructor(name: string|string[], path: string) {
        applicableSpecifiers
        .forEach((specifier: string) => {
            name = [ name ].flat();
            
            let i = 0;
            let fullName: string,
                fullPath: string;
            do {
                fullName = `${_config.appNameShort.toLowerCase()}.${name[i++]}${specifier}.json`; // TODO: More config formats?
                fullPath = join(path, `${fullName}`);
            } while(!existsSync(fullPath) && (i < name.length));
            
            if(!existsSync(fullPath)) {
                return;
            }

            let fileObj;
            try {
                fileObj = require(fullPath);
            } catch(err) {
                throw SyntaxError(`Configuration file could not be parsed:\n${err.message}${fullName ? ` '${path}'` : ""}`);
            }

            this.obj = Config.deepMergeObj(this.obj, fileObj);
        }); // TODO: Merge in default (later)
    }

    /**
     * Create an individually callable value type resolve
     * interface for configurations that have been read from
     * an arbitrary context.
     * @param value Base value as parsed from configuration file
     * @returns Optional type resolve function object
     */
    private createResolveInterface(value: unknown): ITypeResolveInterface {
        return {
            bool: () => {
                return (value && value !== "false");
            },
            number: () => {
                return Number.parseFloat(value.toString());
            },
            string: () => {
                return value.toString();
            },
        };
    }

    /**
     * Read a specific value from the configuration possibly
     * given a nested key as an array of keys.
     * @param nestedKey Atomic key or array of nested keys
     * @returns Type resolve interface
     */
    public get(nestedKey: string|string[]): ITypeResolveInterface {
        const keys: string[] = [ nestedKey ].flat();

        let value: string|number|boolean|TJSONObject = this.obj[keys.shift()];

        try {
            keys
            .forEach((key: string) => {
                value = (value as TJSONObject)[key];
            });
        } catch {
            throw new SyntaxError(`Required configuration missing '${keys.join(".")}'`);    // TODO: To resolve interface to depict required type?
        }

        return this.createResolveInterface(value);
    }

}