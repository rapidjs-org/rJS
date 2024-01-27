import * as sharedmemory from "./sharedmemory";


export function write<T>(uniqueItemKey: string, data: T) {
    sharedmemory.write(uniqueItemKey, Buffer.from(JSON.stringify(data), "utf-8"));
}

export function read<T>(uniqueItemKey: string): T {
    const rawData: string = String(sharedmemory.read(uniqueItemKey));
    return rawData.length ? (JSON.parse(rawData) as T) : undefined;
}

export function free(uniqueItemKey: string) {
    sharedmemory.free(uniqueItemKey);
}