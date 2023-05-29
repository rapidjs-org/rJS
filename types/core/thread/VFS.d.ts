export const __esModule: boolean;
/**
 * Class representing a comprehensively response writing
 * and closing a given socket.
 */
export class VFS extends ASharedLimitDictionary_1.ASharedLimitDictionary {
    root: string;
    getAbsolutePath(path: any): string;
    getFileReference(path: any): {
        ctime: number;
        mtime: number;
    };
    getFileStamp(path: any, data: any): {
        ETag: string;
        data: any;
    };
    retrieveReferenceCallback(path: any): {
        ctime: number;
        mtime: number;
    };
    validateLimitCallback(reference: any, current: any): boolean;
    write(): void;
    writeVirtual(path: any, data: any): void;
    writeDisc(path: any, data: any): void;
}
import ASharedLimitDictionary_1 = require("./ASharedLimitDictionary");
