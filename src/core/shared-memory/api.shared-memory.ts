/**
 * Module representing the tactile node interface for accessing
 * the shared memory functionality bound with the node addon API
 * in order to maintain coherent and consistent memory packets
 * across independent, but logically related node processes.
 */


import { EventEmitter } from "stream";
import { EmbedContext } from "../EmbedContext";   // Special cross-reference

import * as sharedMemory from "./shared-memory";


/*
 * High-level storage fallback in case low-level shared memory
 * mapping behavior is unavailable. Provides a uniformal module
 * interface in order to prevent abstract handling requirement.
 */
const intermediateMemory: Map<string, string> = new Map();

const concreteAppKey: number = generateConcreteAppKey();

const reactivateTimeoutValue: number = 1000 * 60 * 5;


/*
 * Register whether shared memory ca be accessed in order to
 * circumvent repeated failing low-level memory access approaches.
 */
let isActive: boolean = true;


/*
 * Globally initialize shared memory for the current concrete
 * application context.
 */
sharedMemory.init(concreteAppKey);


/**
 * Generate a unique key for the current concrete application
 * context that is used for identifying related memory space
 * from low-level scope. Uses a rotating unsigned integer (32-bit)
 * representation of the concrete application path (working
 * directory) as is assumed to be unique.
 * @returns Numerical application key
 */
function generateConcreteAppKey(): number { // uint32_t (MAX: 4294967296)
    return parseInt(`rapidJS:${EmbedContext.global.path}`  // TODO: Check if process CWD is consistent among related contexts
    .split("")
    .map((char: string) => char.charCodeAt(0).toString(16))
    .join("")) % 4294967296;
}

function deactivate() {
    console.log(`Shared memory unavailable: Process-local store intermediate for ${reactivateTimeoutValue / 60000} m`);
    
    isActive = false; // TODO: Distinguish errors?

    setTimeout(() => {
        isActive = true;
    }, reactivateTimeoutValue);
}


/**
 * Write a key-value-pair to the shared memory associated with the
 * current conrete application context. Appends the application
 * specific key implicitly.
 * @param purposeKey Key related to a specific purpose
 * @param purposeData Data stored for specific purpose
 */
export async function writeSync(purposeKey: string, purposeData: unknown) {
    const serial: string = (!(typeof(purposeData) === "string")
    ? JSON.stringify(purposeData)
    : purposeData);
    
    if(isActive) {
        try {
            sharedMemory.write(purposeKey, Buffer.from(serial, "utf-8"));
            return;
        } catch(err) {
            deactivate();
        }
    }

    intermediateMemory.set(purposeKey, serial);
}

/**
 * Asynchronous wrapper for shared memory write.
 * @returns Promise resolving once the data has been written to shared memory
 */
export async function write(purposeKey: string, purposeData: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            writeSync(purposeKey, purposeData);

            resolve();
        } catch(err) {
            reject(err);
        }
    });
}

/**
 * Read a value from the shared memory associated with the
 * current conrete application context and a given purpose key.
 * Appends the application specific key implicitly.
 * @param purposeKey Key related to a specific purpose
 * @returns Data stored for specific purpose
 */
export function readSync<T>(purposeKey: string): T {
    let serial;
    if(isActive) {
        try {
            const buffer: Buffer = sharedMemory.read(purposeKey);

            serial = String(buffer);
        } catch {
            deactivate();
        }
    }
    
    serial = serial ?? intermediateMemory.get(purposeKey);

    let data: T;
    try {
        data = JSON.parse(serial);
    } catch {
        data = serial as unknown as T;
    }

    return (data || null) as T;
}

/**
 * Asynchronous wrapper for shared memory read.
 * @returns Promise resolving to the data read from shared memory
 */
export function read<T>(purposeKey: string): Promise<T> {
    return new Promise(resolve => {
        const data: T = readSync<T>(purposeKey);
        
        resolve(data);
    });
}

/**
 * Register the concrete application specific abstracted low-level
 * shared memory for being freed once the related process emits a
 * given event (e.g. upon 'exit').
 * @param event Event name(s) to bind free call to
 */
export function registerFree(event: string|string[]) {
    [ event ].flat()
    .forEach((event: string) => {
        process.on(event, () => sharedMemory.free());
    });
}   // TODO: Implement at unbed (consistent among runs otherwise as long as heap is maintained)


/**
 * Get the current comncrete application shared memory key.
 * SERVES TEST PURPOSES ONLY.
 * @returns Numerical application key
*/
export function getConcreteAppKey(): number {
    return concreteAppKey;
}