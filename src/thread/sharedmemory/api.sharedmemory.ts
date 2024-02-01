import * as sharedmemory from "./sharedmemory";


const IS_UNIX_BASED_OS = (process.platform !== "win32");    // Optimistic


let isDisabled: boolean = !IS_UNIX_BASED_OS;


const fallbackStorage: Map<string, unknown> = new Map()
const writtenUniqueItemKeys: Set<string> = new Set();


export async function write<T>(uniqueItemKey: string, data: T) {
    if(isDisabled) {
        fallbackStorage.set(uniqueItemKey, data);

        return;
    }

    try {
        sharedmemory.write(uniqueItemKey, Buffer.from(JSON.stringify(data), "utf-8"));
    } catch {
        isDisabled = true;  // One time write failure => disable SHM

        write<T>(uniqueItemKey, data);
    }

    writtenUniqueItemKeys.add(uniqueItemKey);
}

export function read<T>(uniqueItemKey: string): T {
    if(isDisabled) {
        return fallbackStorage.get(uniqueItemKey) as T;
    }
    
    try {
        const rawData: string = sharedmemory.read(uniqueItemKey).toString();
        
        return rawData.length ? (JSON.parse(rawData) as T) : undefined;
    } catch(err) {
        return undefined;
    }
}

export function free(uniqueItemKey: string) {
    if(isDisabled) {
        fallbackStorage.delete(uniqueItemKey);

        return;
    }

    try {
        sharedmemory.free(uniqueItemKey);
    } catch {}
}

export function freeAll() {
    console.log("FREE ALL");
    Array.from(writtenUniqueItemKeys)
    .forEach((key: string) => {free(key);console.log(key)});
}