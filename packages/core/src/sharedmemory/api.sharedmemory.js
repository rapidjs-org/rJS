import { Util } from "@rapidjs.org/shared";
import * as sharedmemory from "./sharedmemory";
let isDisabled = !Util.isUnixBasedOS;
const fallbackStorage = new Map();
const writtenUniqueItemKeys = new Set();
export async function write(uniqueItemKey, data) {
    if (isDisabled) {
        fallbackStorage.set(uniqueItemKey, data);
        return;
    }
    try {
        sharedmemory.write(uniqueItemKey, Buffer.from(JSON.stringify(data), "utf-8"));
    }
    catch (_a) {
        isDisabled = true; // One time write failure => disable SHM
        write(uniqueItemKey, data);
    }
    writtenUniqueItemKeys.add(uniqueItemKey);
}
export function read(uniqueItemKey) {
    if (isDisabled) {
        return fallbackStorage.get(uniqueItemKey);
    }
    try {
        const rawData = sharedmemory.read(uniqueItemKey).toString();
        return rawData.length ? JSON.parse(rawData) : undefined;
    }
    catch (err) {
        return undefined;
    }
}
export function free(uniqueItemKey) {
    if (isDisabled) {
        fallbackStorage.delete(uniqueItemKey);
        return;
    }
    try {
        sharedmemory.free(uniqueItemKey);
    }
    catch (_a) { }
}
export function freeAll() {
    Array.from(writtenUniqueItemKeys)
        .forEach((key) => free(key));
}
