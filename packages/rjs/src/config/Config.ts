import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { TJSON } from "../types";

import _config from "../_config.json";


export class Config {
	private static deepMergeObjects(targetObj: TJSON, sourceObj: TJSON): TJSON {
		for(const key of (Object.keys(targetObj).concat(Object.keys(sourceObj)))) {
			if((targetObj[key] || "").constructor.name !== "Object"
            || (sourceObj[key] || "").constructor.name !== "Object") {
				targetObj[key] = sourceObj[key] || targetObj[key];

				continue;
			}
            
			sourceObj[key] = Config.deepMergeObjects(
                targetObj[key] as TJSON, sourceObj[key] as TJSON
			);
		}
        
		return { ...targetObj, ...sourceObj };
	}

	private readonly obj: TJSON;
	private readonly path: string;
	private readonly name?: string;

	constructor(path: string, name?: string, defaultsObj: TJSON = {}) {
		this.path = path;
		this.name = name;
        
		this.obj = defaultsObj;
		this.obj = Config.deepMergeObjects(this.obj, this.parseFile());
		this.obj = Config.deepMergeObjects(this.obj, this.parseFile(process.env.DEV ? _config.configNameInfixDev : _config.configNameInfixProd));
	}

	private parseFile(modeInfix?: string): TJSON {
		const configFilePath: string = resolve(
			this.path,
			[
				_config.configNamePrefix,
				this.name,
				modeInfix,
				"json"
			]
            .filter((part: string|null) => !!part)
            .join(".")
		);
		return existsSync(configFilePath)
			? JSON.parse(readFileSync(configFilePath).toString())
			: {};
	}
    
	public read(...nestedKeys: string[]) {
		let obj: TJSON = this.obj;
		for(const key of nestedKeys) {
			obj = obj[key] as TJSON;
                            
			if(obj === undefined) break;
		}

		const isSet = ![ undefined, null ].includes(obj);
		return {
			obj: () => isSet ? obj : null,
			string: (): string => isSet ? obj.toString() : null,
			number: (): number => isSet ? parseFloat(obj.toString()) : null,
			boolean: (): boolean => isSet ? obj.toString() === "true" : null
		};
	}
}