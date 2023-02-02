import * as sharedMemory from "./shared-memory";


const sharedMemoryActive = {
    write: true,
    read: true
};
const appKey: number = generateAppKey();

const intermediateMemory: Map<string, string> = new Map();    // Fallback

sharedMemory.init(appKey);


function generateAppKey(): number { // uint32_t (MAX: 4294967296)
    return parseInt(`rapidJS:${process.env.PATH}`  // TODO: Check if process CWD is consistent among related contexts
    .split("")
    .map((char: string) => char.charCodeAt(0).toString(16))
    .join("")) % 4294967296;
}


export function getAppKey(): number {
    return appKey;
}

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

export async function writeSync(purposeKey: string, purposeData: unknown) {
    const serial: string = (!(typeof(purposeData) === "string")
    ? JSON.stringify(purposeData)
    : purposeData);
    
    if(!sharedMemoryActive.write) {
        try {
            sharedMemory.write(purposeKey, Buffer.from(serial, "utf-8"));

            return;
        } catch(err) {            
            sharedMemoryActive.write = false; // TODO: Distinguish errors?
        }
    }

    intermediateMemory.set(purposeKey, serial);
}

export function read<T>(purposeKey: string): Promise<T> {
    return new Promise(resolve => {
        const data: T = readSync<T>(purposeKey);
        
        resolve(data);
    });
}

export function readSync<T>(purposeKey: string): T {
    let serial;
    if(sharedMemoryActive.read) {
        try {
            const buffer: Buffer = sharedMemory.read(purposeKey);
            
            serial = String(buffer);
        } catch {
            sharedMemoryActive.read = false;
        }
    }

    serial = serial ?? intermediateMemory.get(purposeKey)M
    
    let data: T;
    try {
        data = JSON.parse(serial);
    } catch {
        data = serial as unknown as T;
    }

    return (data || null) as T;
}

export function registerFree(event: string|string[], exitCode = 0) {
    [ event ].flat()
    .forEach((event: string) => {
        process.on(event, () => {
            sharedMemory.free();
            
            process.exit(exitCode);
        });
    });
}