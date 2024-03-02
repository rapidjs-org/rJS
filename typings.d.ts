/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
declare module "common/Args" {
    export class Args {
        private readonly raw;
        static cli: Args;
        constructor(raw?: string[]);
        /**
         * Retrieve the index of a key in the arguments array.
         * @param name Full key (without indicating double dashes)
         * @param shorthand Shorthand key (without indicating single dash)
         * @returns Value type resolve interface
         */
        private retrieveKeyIndex;
        /**
         * Parse a specific positional argument from the given command
         * line arguments.
         * @param index Position key
         * @returns The name of the positional argument if provided at index (no indicating dash)
         */
        parsePositional(index?: number): string;
        /**
         * Parse a specific flag from the given command line arguments.
         * @param key Flag key (without indicating double dashes)
         * @param shorthand Flag shorthand (without indicating single dash)
         * @returns Whether the flag is set
         */
        parseFlag(key: string, shorthand?: string): boolean;
        /**
         * Parse a specific option from the given command line arguments.
         * @param key Option key (without indicating double dashes)
         * @param [shorthand] Option shorthand (without indicating single dash)
         * @returns Value type resolve interface
         */
        parseOption(key: string, shorthand?: string): {
            string: string;
            number: number;
        };
    }
}
declare module "types" {
    export type TJSON = {
        [key: string]: string | number | boolean | TJSON;
    };
    export type TProtocol = "HTTP" | "HTTPS";
    export type THeaders = {
        [key: string]: string;
    };
    export type TStatusCode = number;
}
declare module "common/InterruptionHandler" {
    export class InterruptionHandler {
        static register(callback: (code?: number) => void): void;
        static registerUncaught(callback: (error?: Error) => void): void;
    }
}
declare module "common/Util" {
    export class Util {
        static isUnixBasedOS: boolean;
    }
}
declare module "common/IPCServer" {
    type TCommandHandler = (commandParam?: unknown) => unknown;
    export class IPCServer {
        private static locateIPCFile;
        private static removeSocketFile;
        static clean(associatedPort: number): void;
        static associatedPorts(): number[];
        static message(associatedPort: number, command: string, commandParam?: unknown): Promise<unknown>;
        private readonly commandRegistry;
        constructor(associatedPort: number, listensCallback?: (() => void), errorCallback?: (err: Error) => void);
        registerCommand(command: string, handler: TCommandHandler): this;
    }
}
declare module "interfaces" {
    import { THeaders, TProtocol } from "types";
    export interface IContextEmbed {
        cwd?: string;
        args?: string[];
        protocol?: TProtocol;
        hostnames?: string[];
        port?: number;
        clustered?: boolean;
    }
    export interface IHTTPMessage {
        version: string;
        protocol: string;
        method: string;
        url: string;
        headers: THeaders;
        body: string | null;
    }
    export interface IRequest {
        method: string;
        url: string;
        headers: THeaders;
        clientIP: string;
        body?: string;
    }
    export interface IResponse {
        status: number;
        headers: THeaders;
        message?: string | Buffer;
    }
    export interface IProxyMonitor {
        isAlive: boolean;
        pid: number;
        hostnames: string[] | string[][];
        aliveTime: number;
        port?: number;
    }
    export interface IApiEmbed {
        port: number;
        hostnames: string | string[];
    }
}
declare module "common/Config" {
    import { TJSON } from "types";
    export class Config {
        private readonly obj;
        private cumulatedErrorMessages;
        private errorImmediate;
        constructor(relativeDirPath: string, defaultObj?: TJSON);
        private raiseSyntaxError;
        addTypeConstraint(keys: string | string[], typeConstraint: string | string[]): this;
        addDefinedConstraint(...keys: string[]): this;
        get<T>(...keys: string[]): T;
    }
}
declare module "common/Context" {
    import { Config } from "common/Config";
    type TMode = "PROD" | "DEV";
    export class Context {
        static MODE: TMode;
        static CONFIG: Config;
    }
}
declare module "common/AWorkerPool" {
    import { EventEmitter } from "events";
    /**
     * Abstract class representing the foundation for concrete
     * descriptions of worker entity pools.
     */
    export abstract class AWorkerPool<Worker extends EventEmitter, I, O> extends EventEmitter {
        private readonly baseSize;
        private readonly timeout;
        private readonly maxPending;
        private readonly activeWorkers;
        private readonly idleWorkers;
        private readonly pendingAssignments;
        constructor(baseSize?: number, timeout?: number, maxPending?: number);
        /**
         * Methods expected to implement the creation / destruction
         * of a worker entity to be returned.
         */
        protected abstract createWorker(): Worker | Promise<Worker>;
        protected abstract destroyWorker(worker: Worker): void;
        /**
         * Method expected to activate a worker being given the
         * managed worker and the input data.
         * @param worker Worker that is to be activated
         * @param dataIn Data input according to generic type
         */
        protected abstract activateWorker(worker: Worker, dataIn: I): void;
        /**
         * Internally activate the next candidate worker entity
         * with respectively assigned data.
         */
        private activate;
        /**
         * Get unique identifier associated with a worker entity.
         * @param worker Worker entity
         * @returns Numeric identifier
         */
        protected getWorkerId(worker: Worker): number;
        /**
         * Accessibly deactivate a worker entity.
         * @param worker Worker entity
         * @param dataOut Data to write out to the assignment context
         */
        deactivateWorker(worker: Worker, dataOut: O | Error): void;
        /**
         * Assign work to a worker entity possibly pending for
         * being handled in case of exhausted pool capacity.
         * @param dataIn Data input
         * @returns Promise resolving with worker results once done handling
         */
        assign(dataIn: I): Promise<O>;
        clear(): void;
    }
}
declare module "proxy/ProcessPool" {
    import { Socket } from "net";
    import { ChildProcess } from "child_process";
    import { AWorkerPool } from "common/AWorkerPool";
    import { IHTTPMessage } from "interfaces";
    export interface IClientPackage {
        socket: Socket;
        message: IHTTPMessage;
    }
    /**
     * Class representing a concrete server process worker pool
     * build around forked and traced child processes.
     */
    export class ProcessPool extends AWorkerPool<ChildProcess, IClientPackage, void> {
        private readonly childProcessModulePath;
        private readonly cwd;
        private readonly args;
        constructor(childProcessModulePath: string, cwd: string, args: string[], baseSize?: number, timeout?: number, maxPending?: number);
        /**
         * Create a worker process as required by the abstract parent
         * class. Forks the process incarnating the designated child
         * module.
         * @returns Child process handle
         */
        protected createWorker(): Promise<ChildProcess>;
        /**
         * Destroy a worker process as required by the abstract parent
         * class. Terminates the process registered as a worker.
         * @param childProcess Child process handle
         */
        protected destroyWorker(childProcess: ChildProcess): void;
        /**
         * Activate a worker as required by the abstract parent class.
         * Sends the input data encoding request and socket related
         * child data to the candidate process.
         * @param childProcess Candidate child process
         * @param childData Child data package
         */
        protected activateWorker(childProcess: ChildProcess, clientPackage: IClientPackage): void;
    }
}
declare module "common/SocketResponder" {
    import { Socket } from "net";
    import { TStatusCode, THeaders } from "types";
    export class SocketResponder {
        static respond(socket: Socket, status: TStatusCode, headers?: THeaders, message?: Uint8Array): void;
    }
}
declare module "common/MultiMap" {
    export class MultiMap<K, T> {
        private readonly associationMap;
        private readonly valueMap;
        private entryCounter;
        private normalizeKeyArgument;
        private cleanValues;
        /**
         * Set a value to the map given an arbitrary, non-zero
         * integral amount of keys to associate with.
         * @param keyArgument Atomic key or array of keys to associate
         * @param value Common value
         */
        set(keyArgument: K | K[], value: T): void;
        /**
         * Get a value by atomic key.
         * @param key Atomic key associated with value
         * @returns Associated value
         */
        get(keyArgument: K | K[]): T;
        /**
         * Delete a value by atomic key.
         * @param key Atomic key associated with value
         */
        delete(keyArgument: K | K[]): boolean;
        /**
         * Check whether a given atomic key is associated
         * with a value in the map.
         * @param key Atomic key to check for
         * @returns Whether an associated value exists
         */
        has(keyArgument: K | K[]): boolean;
        clear(): void;
        /**
         * Get the size of the map depicting the number of
         * values existing tin the map.
         * @returns Size
         */
        size(): number;
        /**
         * Get keys as nested array of association related
         * key arrays.
         * @returns Array of related key arrays
         */
        keys(): K[][];
        forEach(callback: (value: T) => void): void;
    }
}
declare module "proxy/HTTPParser" {
    import { IHTTPMessage } from "interfaces";
    export class HTTPParser {
        static parseBytes(data: Buffer): IHTTPMessage;
    }
}
declare module "proxy/api.proxy" {
    import { IContextEmbed } from "interfaces";
    export function embedContext(contextEmbed: IContextEmbed): Promise<number>;
    export function init(contextEmbed: IContextEmbed, enableProxyIPC?: boolean): Promise<number>;
}
declare module "api/api" {
    import { IApiEmbed, IProxyMonitor } from "interfaces";
    export function embed(workingDir?: string): Promise<IApiEmbed>;
    export function unbed(port?: number, hostnames?: string | string[]): Promise<void>;
    type TDisplayProxyMonitor = (IProxyMonitor & {
        port: number;
    });
    export function monitor(): Promise<TDisplayProxyMonitor[]>;
}
