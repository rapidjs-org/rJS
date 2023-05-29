export const __esModule: boolean;
export class ASharedDictionary {
    constructor(normalizeKeyCallback: any);
    normalizeKeyCallback: any;
    id: number;
    getInternalKey(key: any): string;
    normalizeKey(key: any): any;
    writeShared(value: any, key: any): Promise<void>;
    readShared(key: any): any;
}
export namespace ASharedDictionary {
    const sharedKeyPrefix: string;
    const instances: number;
    const shmEnabled: boolean;
}
