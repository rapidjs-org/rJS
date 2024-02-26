import { join } from "path";
import { existsSync } from "fs";

import { TJSON } from "../types";
import { Context } from "./Context";


const _config = {
	configurationFileName: "config"
};


export class Config {
	private readonly obj: TJSON;
	private cumulatedErrorMessages: string[] = [];
	private errorImmediate: NodeJS.Immediate;

	constructor(relativeDirPath: string, defaultObj: TJSON = {}) {
		try {
			const requireConfigObj = (configFileName: string): TJSON => {
				const configFilePath: string = join(process.cwd(), relativeDirPath, `${configFileName}.json`);
				return existsSync(configFilePath) ? require(configFilePath) : {};
			};

			this.obj = {
				...defaultObj,

				...requireConfigObj(_config.configurationFileName),
				...requireConfigObj(`${Context.MODE.toLowerCase()}.${_config.configurationFileName}`)
			};
			// TODO: Other formats (.yaml, ...)
		} catch(err) {
			throw new SyntaxError(`Failed to parse configuration file:\n${err.message}`);
		}
	}

	private raiseSyntaxError(message: string, ...keys: string[]) {
		clearImmediate(this.errorImmediate);

		this.cumulatedErrorMessages.push(`'${keys.join(".")}': ${message}`);

		this.errorImmediate = setImmediate(() => {
			throw new SyntaxError(`Failed to parse configuration file:\n${
				this.cumulatedErrorMessages.join("\n")
			}`);
		});
	}

	public addTypeConstraint(keys: string|string[], typeConstraint: string|string[]): this {
		const keysArray: string[] = [ keys ].flat();

		const typeConstraintArray: string[] = [ typeConstraint ]
		.flat()
		.map((type: string) => type.toLowerCase());
		const type: string = typeof(this.get(...keysArray));

		(!typeConstraintArray.includes(type))
        && this.raiseSyntaxError(`Invalid type '${type}' (expected '${typeConstraintArray.join(", ")}')`, ...keysArray);
		
		return this;
	}

	public addDefinedConstraint(...keys: string[]): this {
		if(![ undefined, null ].includes(this.get(...keys))) return this;
        
		this.raiseSyntaxError("Required, but not defined", ...keys);

		return this;
	}
    
	public get<T>(...keys: string[]): T {
		let intermediate = this.obj;
		for(const key of keys) {
			intermediate = intermediate[key] as TJSON;
		}
		return intermediate as T;
	}
}