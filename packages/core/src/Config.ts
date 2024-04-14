import { join } from "path";
import { existsSync } from "fs";

import { TAtomic, TJSON } from "@common/types";


const _config = {
    defaultConfigNameSuffixes: [ ".rjs", ".rapidjs" ]
};


export enum EConfigConstraint {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean"
}

export class Config {
    private readonly configObj: TJSON = {};
    
    constructor(name: string, dirPath: string = process.cwd()) {
        for(let defaultConfigNameSuffix of _config.defaultConfigNameSuffixes) {
            const potentialConfigPath: string = join(dirPath, `${name}${defaultConfigNameSuffix}.json`);
            if(!existsSync(potentialConfigPath)) continue;

            this.configObj = require(potentialConfigPath);
            // TODO: Auto declare by given defaults JSON
            break;
        }
    }

    private obtainProperty(key: string|string[]): TJSON|TAtomic|TAtomic[] {
        const chainedKeys: string[] = [ key ].flat();

        let property: TJSON|TAtomic|TAtomic[] = this.configObj;

        for(let chainedKey of chainedKeys) {
            property = (property as TJSON)[chainedKey];
        }

        return property;
    }

    public declareProperty(key: string|string[], typeConstraint?: EConfigConstraint, defaultValue?: TAtomic|TAtomic[]): this {
        let property: TJSON|TAtomic|TAtomic[];

        const setProperty = (value: TAtomic|TAtomic[]) => {
            const chainedKeys: string[] = [ key ].flat();

            property = this.configObj;

            chainedKeys
            .forEach((key: string, i: number) => {
                (property as TJSON)[key] = (i + 1 === chainedKeys.length) ? value : {};
                property = (property as TJSON)[key];
            });
        };
        
        try {
            property = this.obtainProperty(key);
        } catch {
            setProperty(undefined);
        }

        (property === undefined)
        && setProperty(defaultValue);

        switch(typeConstraint) {
            case EConfigConstraint.STRING:
                setProperty(property.toString());
                break;
            case EConfigConstraint.NUMBER:
                setProperty(parseFloat(property as string) ?? defaultValue);
                break;
            case EConfigConstraint.BOOLEAN:
                setProperty(
                    typeof(property) === "boolean"
                    ? property
                    : (property === "true" ? true
                        : (property === "false" ? false
                            : defaultValue))
                );
                break;
        }

        return this;
    }
    
    public get<T>(key: string|string[]): T {
        try {
            return this.obtainProperty(key) as T;
        } catch {
            return undefined;
        }
    }
}