import { readSync as shmReadSync, writeSync as shmWriteSync } from "./shared-memory/api.shared-memory";


export abstract class ASharedDictionary<K, V> {
    
    private static readonly sharedKeyPrefix: string = "SD:";
    private static instances = 0;
    
    protected static shmEnabled = true;

    private readonly normalizeKeyCallback: (key: K) => K;

    protected readonly id: number;
    
    constructor(normalizeKeyCallback?: (key: K) => K) {
    	this.normalizeKeyCallback = normalizeKeyCallback || (k => k);   // Identity by default
        
    	this.id = ASharedDictionary.instances++;  // Consistent among processes due to same order of instantiations
    }
    
    private getInternalKey(key?: K): string {
    	return `${ASharedDictionary.sharedKeyPrefix}${this.id}${key ? this.normalizeKey(key) : ""}`;
    }

    protected normalizeKey(key: K): K {
    	return this.normalizeKeyCallback(key);
    }

    protected writeShared(value: V, key?: K): Promise<void> {
    	return shmWriteSync(this.getInternalKey(key), value);   // TODO: Note key is stringified implicitly (requires unambiguos serialization)
    }

    protected readShared(key?: K): V {
    	const data: V = shmReadSync<V>(this.getInternalKey(key));

    	ASharedDictionary.shmEnabled = (data === null);
        
    	return data;
    }

}