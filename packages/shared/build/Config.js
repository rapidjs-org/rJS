import { join } from "path";
import { existsSync } from "fs";
import { Context } from "./Context";
const _config = {
    configurationFileName: "config"
};
export class Config {
    constructor(relativeDirPath, defaultObj = {}) {
        this.cumulatedErrorMessages = [];
        try {
            const requireConfigObj = (configFileName) => {
                const configFilePath = join(process.cwd(), relativeDirPath, `${configFileName}.json`);
                return existsSync(configFilePath) ? require(configFilePath) : {};
            };
            this.obj = Object.assign(Object.assign(Object.assign({}, defaultObj), requireConfigObj(_config.configurationFileName)), requireConfigObj(`${Context.MODE.toLowerCase()}.${_config.configurationFileName}`));
            // TODO: Other formats (.yaml, ...)
        }
        catch (err) {
            throw new SyntaxError(`Failed to parse configuration file:\n${err.message}`);
        }
    }
    raiseSyntaxError(message, ...keys) {
        clearImmediate(this.errorImmediate);
        this.cumulatedErrorMessages.push(`'${keys.join(".")}': ${message}`);
        this.errorImmediate = setImmediate(() => {
            throw new SyntaxError(`Failed to parse configuration file:\n${this.cumulatedErrorMessages.join("\n")}`);
        });
    }
    addTypeConstraint(keys, typeConstraint) {
        const keysArray = [keys].flat();
        const typeConstraintArray = [typeConstraint]
            .flat()
            .map((type) => type.toLowerCase());
        const type = typeof (this.get(...keysArray));
        (!typeConstraintArray.includes(type))
            && this.raiseSyntaxError(`Invalid type '${type}' (expected '${typeConstraintArray.join(", ")}')`, ...keysArray);
        return this;
    }
    addDefinedConstraint(...keys) {
        if (![undefined, null].includes(this.get(...keys)))
            return this;
        this.raiseSyntaxError("Required, but not defined", ...keys);
        return this;
    }
    get(...keys) {
        let intermediate = this.obj;
        for (const key of keys) {
            intermediate = intermediate[key];
        }
        return intermediate;
    }
}
