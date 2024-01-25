import { join } from "path";
import { existsSync } from "fs";

import { TJSON } from "../process/types";
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

	private raiseSyntaxError(key: string, message: string) {
		clearImmediate(this.errorImmediate);

		this.cumulatedErrorMessages.push(`'${key}': ${message}`);

		this.errorImmediate = setImmediate(() => {
			throw new SyntaxError(`Failed to parse configuration file:\n${
				this.cumulatedErrorMessages.join("\n")
			}`);
		});
	}

	public addTypeConstraint(key: string, typeConstraint: string|string[]): this {
		const typeConstraintArray: string[] = [ typeConstraint ]
		.flat()
		.map((type: string) => type.toLowerCase());
		const type: string = typeof(this.obj[key]);

		(!typeConstraintArray.includes(type))
        && this.raiseSyntaxError(key, `Invalid type '${type}' (expected )`);

		return this;
	}

	public addDefinedConstraint(key: string): this {
		if(![ undefined, null ].includes(this.obj[key])) return this;
        
		this.raiseSyntaxError(key, "Required, but not defined");

		return this;
	}
    
	public get<T>(key: string): T {
		return this.obj[key] as unknown as T;
	}
}