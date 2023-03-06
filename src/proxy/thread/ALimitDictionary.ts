import * as sharedMemory from "../../shared-memory/api.shared-memory";


interface ILimitEntry<V, L> {
    value: V;
    limitReference: L;
}

/**
 * Abstract class representing a dictionary whose entries are
 * existentially bound to a specific limit reference.
 */
export abstract class ALimitDictionary<K, V, L> {
    
    private static readonly sharedKeyPrefix: string = "LD:";
    
    private static instances = 0;

    private readonly id: number;
    private readonly normalizeKeyCallback: (key: K) => K;

    private existenceLookupValue: {
        key: K;
        value: V;
        timestamp: number;
    };

    constructor(normalizeKeyCallback?: (key: K) => K) {
        this.normalizeKeyCallback = normalizeKeyCallback || (k => k);   // Identity by default
        
        this.id = ALimitDictionary.instances++;  // Consistent among processes due to same order of instance creation (assuming no race consitions)
    }
    
    protected abstract retrieveReferenceCallback(key: K): L;
    protected abstract validateLimitCallback(reference: L, current: L): boolean;

    private getInternalKey(key: K): string {
        return `${ALimitDictionary.sharedKeyPrefix}${this.id}${this.normalizeKeyCallback(key).toString()}`;
    }

    protected setExistenceLookup(key: K, value: V) {
        this.existenceLookupValue = {
            key: this.normalizeKeyCallback(key),
            value: value,
            timestamp: Date.now()
        };
    }

    public write(key: K, value: V) {
        const entry: ILimitEntry<V, L> = {
            value: value,
            limitReference: this.retrieveReferenceCallback(key)
        };
        
        // TODO: Benchmark w and w/o enabled top layer intermediate memory (-> Dict <-> intermediate <-> SHM)

        sharedMemory.writeSync(this.getInternalKey(key), entry);   // TODO: Note key is stringified implicitly (requires unambiguos serialization)
    }

    public read(key: K): V {
        // TODO: Implement intermediate

        if((this.existenceLookupValue || {}).key !== this.normalizeKeyCallback(key)
        || (Date.now() - ((this.existenceLookupValue || {}).timestamp || 0)) > 1000) {    // TODO: Define timeout threshold (from config?)
            const exists: boolean = this.exists(key);

            if(!exists) {
                return null;
            }
        }
        
        const retrievedValue: V = this.existenceLookupValue.value;
        
        this.existenceLookupValue = null;

        return retrievedValue;  
    }   // Async interface { read, readSync } ?

    public exists(key: K): boolean {
        // TODO: Implement intermediate

        let limitEntry: ILimitEntry<V, L> = sharedMemory.readSync<ILimitEntry<V, L>>(this.getInternalKey(key));
        
        if(!limitEntry) {
            return false;
        }
        
        let reference: L;
        try {
            reference = this.retrieveReferenceCallback(key);
        } catch {
            return false;
        }
        
        if(!this.validateLimitCallback(limitEntry.limitReference, reference)) {
            return false;
        }
        
        this.setExistenceLookup(key, limitEntry.value); // Already store to reduce repeated SHM access on subsequent read

        return true;
    }

}