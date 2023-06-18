import { ASharedDictionary } from "../ASharedDictionary";


interface ILimitValue<V, L> {
    value: V;
    limitReference: L;
}

/**
 * Abstract class representing a dictionary whose entries are
 * existentially bound to a specific limit reference.
 */
export abstract class ASharedLimitDictionary<K, V, L> extends ASharedDictionary<K, ILimitValue<V, L>> {
    
    private existenceLookupValue: {
        key: K;
        value: V;
        timestamp: number;
    };

    constructor(normalizeKeyCallback?: (key: K) => K) {
    	super(normalizeKeyCallback);
    }
    
    protected abstract retrieveReferenceCallback(key: K): L;
    protected abstract validateLimitCallback(reference: L, current: L): boolean;

    protected setExistenceLookup(key: K, value: V) {
    	this.existenceLookupValue = {
    		key: this.normalizeKey(key),
    		value: value,
    		timestamp: Date.now()
    	};
    }

    public write(key: K, value: V) {
    	const limitValue: ILimitValue<V, L> = {
    		value: value,
    		limitReference: this.retrieveReferenceCallback(key)
    	};
        
    	// TODO: Benchmark w and w/o enabled top layer intermediate memory (-> Dict <-> intermediate <-> SHM)

    	this.writeShared(limitValue, key);   // TODO: Note key is stringified implicitly (requires unambiguos serialization)
    }

    public read(key: K): V {
    	// TODO: Implement intermediate

    	if((this.existenceLookupValue || {}).key !== this.normalizeKey(key)
        || (Date.now() - ((this.existenceLookupValue || {}).timestamp || 0)) > 250) {    // TODO: Define timeout threshold (from config?)
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

    	const limitValue: ILimitValue<V, L> = this.readShared(key);
        
    	if(!limitValue) {
    		this.setExistenceLookup(key, null);

    		return false;
    	}
        
    	let reference: L;
    	try {
    		reference = this.retrieveReferenceCallback(key);
    	} catch {
    		this.setExistenceLookup(key, null);

    		return false;
    	}
        
    	if(!limitValue.limitReference || !this.validateLimitCallback(limitValue.limitReference, reference)) {
    		this.setExistenceLookup(key, null);
            
    		return false;
    	}
        
    	this.setExistenceLookup(key, limitValue.value); // Already store to reduce repeated SHM access on subsequent read
       
    	return true;
    }

}