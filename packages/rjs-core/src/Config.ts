import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { TJSON } from "./.shared/global.types";

import _config from "./_config.json";


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

	constructor(path: string, name?: string, forDev: boolean = false, defaultsObj: TJSON = {}) {
		this.path = path;
		this.name = name;
        
		this.obj = defaultsObj;
		this.obj = Config.deepMergeObjects(this.obj, this.parseFile());
		this.obj = Config.deepMergeObjects(this.obj, this.parseFile(forDev ? _config.configNameInfixDev : _config.configNameInfixProd));
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

		const isSet: boolean = ![ undefined, null ].includes(obj);
		return {
			object(): TJSON {
				return isSet ? obj as TJSON : null;
			},
			string(): string  {
				return isSet ? obj.toString() : null;
			},
			number(): number {
				return isSet ? parseFloat(obj.toString()) : null;
			},
			boolean(): boolean {
				return isSet ? obj.toString() === "true" : null;
			}
		};
	}
}