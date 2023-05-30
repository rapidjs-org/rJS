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
interface IFileStamp {
    ETag: string;
    data: string;
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
export type TEncoding = IHighlevelEncoding[];
export type TLocale = IHighlevelLocale[];
export type TURL = IHighlevelURL;


export interface IRuntimeMode {
    DEV: boolean;
    PROD: boolean;
}
export interface IRequest {
    method: string;
    headers: THeaders;
    url: IHighlevelURL;
    ip: string;
    
    body?: unknown
    cookies?: TCookies;
    encoding: TEncoding;
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
    public mergeDefault(defaultConfigObj: TJSONObject): void;
    public get(...nestedKey: string[]): ITypeResolveInterface;
}
export class Plugin {
    public static forEach(loopCallback: ((plugin: Plugin) => void)): void;
    public readonly config: Config;
    public readonly VFS: VFS;
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
    public read(path: string): IFileStamp;
    public writeVirtual(path: string, data: string): void;
    public writeDisc(path: string, data: string): void;
    public exists(path: string): boolean;
}
export class Response {
    constructor(message: string, status: number, headers: Record<string, string>, cookies: TCookies);
}


export const config: Config;
export const mode: IRuntimeMode;