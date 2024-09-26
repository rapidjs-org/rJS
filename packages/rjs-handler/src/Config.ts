import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { TJSON, TSerializable } from "./.shared/global.types";
import { Options } from "./.shared/Options";

import _config from "./_config.json";

export class Config {
	private static deepMergeObjects(targetObj: TJSON, sourceObj: TJSON): TJSON {
		for (const key of Object.keys(targetObj).concat(
			Object.keys(sourceObj)
		)) {
			if (
				(targetObj[key] || "").constructor.name !== "Object" ||
                (sourceObj[key] || "").constructor.name !== "Object"
			) {
				targetObj[key] = sourceObj[key] || targetObj[key];

				continue;
			}

			sourceObj[key] = Config.deepMergeObjects(
                targetObj[key] as TJSON,
                sourceObj[key] as TJSON
			);
		}

		return { ...targetObj, ...sourceObj };
	}

	private readonly obj: TJSON;

	constructor(
		path: string,
		name?: string,
		forDev: boolean = false,
		defaultsObj: TJSON = {}
	) {
		this.obj = defaultsObj;
		this.obj = new Options(this.parseFile(path, name), this.obj).object;
		this.obj = new Options(
			this.parseFile(
				path,
				name,
				forDev
					? _config.configNameInfixDev
					: _config.configNameInfixProd
			),
			this.obj
		).object;
	}

	private parseFile(path: string, name: string, modeInfix?: string): TJSON {
		const configFilePath: string = resolve(
			path,
			[_config.configNamePrefix, name, modeInfix, "json"]
                .filter((part: string | null) => !!part)
                .join(".")
		);

		return existsSync(configFilePath)
			? (JSON.parse(readFileSync(configFilePath).toString()) as TJSON)
			: {};
	}

	public read(...nestedKeys: string[]) {
		let obj: TJSON = this.obj;
		for (const key of nestedKeys) {
			obj = obj[key] as TJSON;

			if (obj === undefined) break;
		}

		const isSet: boolean = ![undefined, null].includes(obj);
		return {
			object(): TJSON {
				return isSet ? obj : null;
			},
			string(): string {
				return isSet
					? (obj as unknown as TSerializable).toString()
					: null;
			},
			number(): number {
				return isSet
					? parseFloat((obj as unknown as TSerializable).toString())
					: null;
			},
			boolean(): boolean {
				return isSet
					? (obj as unknown as TSerializable).toString() === "true"
					: null;
			}
		};
	}
}
