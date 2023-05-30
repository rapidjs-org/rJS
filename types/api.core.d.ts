type TJSONObject = { [ key: string ]: TJSONObject|string|number|boolean };

interface ITypeResolveInterface {
    bool: () => boolean;
    number: () => number;
    string: () => string;
    object: () => TJSONObject;
}
interface IHighlevelURL {
    hash: string;
    host: string;
    hostname: string;
    href: string;
    origin: string;
    password: string;
    pathname: string;
    port: string;
    protocol: string;
    search: string;
    username: string;
    searchParams: Record<string, string>;
}
interface IHighlevelEncoding {
    type: string;
    quality: number;
}
interface IHighlevelLocale {
    language: string;
    quality: number;

    region?: string;
}


export type THeaders = Record<string, string>;
export type TCookies = Record<string, {
    value: string|number|boolean;
    
    maxAge?: number;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    sameSite?: string;
}>;
export type TLocale = IHighlevelLocale[];
export type TUrl = IHighlevelURL;


export interface IRuntimeMode {
    DEV: boolean;
    PROD: boolean;
}
export interface IRequest {
    method: string;
    headers: THeaders;
    url: TLocale;
    ip: string;
    
    body?: unknown
    cookies?: TCookies;
    locale?: TLocale;
}
export interface IResponse {
    status: number;
    
    cookies?: TCookies;
    headers?: THeaders;
    message?: string|number|boolean|Buffer;
}
export interface IFileStamp {
    ETag: string;
    data: string|Buffer;
}


export class Config {
    public static readonly global: Config;
    constructor(nameOrDefaultObj: string|string[]|TJSONObject, defaultConfigObj: TJSONObject);
    private createResolveInterface(value: unknown): ITypeResolveInterface;
    public get(...nestedKey: string[]): ITypeResolveInterface;
    public mergeDefault(defaultConfigObj: TJSONObject): void;
}
export class Plugin {
    public static forEach(loopCallback: ((plugin: Plugin) => void)): void;
    public readonly config: Config;
    public readonly name: string;
    public readonly vfs: VFS;
    constructor(name: string);
}
export class Cache<K, V> {
    constructor(duration: number, normalizeKeyCallback?: (key: K) => K);
    public write(key: K, value: V): void;
    public read(key: K): V;
    public exists(key: K): boolean

}
export class VFS {
    constructor(root: string);
    public exists(path: string): boolean;
    public read(path: string): IFileStamp;
    public writeDisc(path: string, data: string): void;
    public writeVirtual(path: string, data: string): void;
}
export class Response {
    constructor(message: string, status: number, headers: Record<string, string>, cookies: TCookies);
}


export const config: Config;
export const mode: IRuntimeMode;