export const __esModule: boolean;
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
    static deepMergeObj(...objs: any[]): any;
    constructor(nameOrDefaultObj: any, defaultConfigObj?: {});
    obj: any;
    /**
     * Create an individually callable value type resolve
     * interface for configurations that have been read from
     * an arbitrary context.
     * @param value Base value as parsed from configuration file
     * @returns Optional type resolve function object
     */
    createResolveInterface(value: any): {
        bool: () => boolean;
        number: () => number;
        string: () => any;
        object: () => any;
    };
    mergeDefault(defaultConfigObj: any): void;
    /**
     * Read a specific value from the configuration possibly
     * given an atomic or nested key as a rest parameter.
     * @param nestedKey Possibly nested keys
     * @returns Type resolve interface
     */
    get(...nestedKey: any[]): {
        bool: () => boolean;
        number: () => number;
        string: () => any;
        object: () => any;
    };
}
export namespace Config {
    const applicableSpecifiers: string[];
    const global: Config;
}
