export const __esModule: boolean;
/**
 * Abstract class representing a dictionary whose entries are
 * existentially bound to a specific limit reference.
 */
export class ASharedLimitDictionary extends ASharedDictionary_1.ASharedDictionary {
    setExistenceLookup(key: any, value: any): void;
    existenceLookupValue: {
        key: any;
        value: any;
        timestamp: number;
    };
    write(key: any, value: any): void;
    read(key: any): any;
    exists(key: any): boolean;
}
import ASharedDictionary_1 = require("../ASharedDictionary");
