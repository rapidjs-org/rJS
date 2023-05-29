export const __esModule: boolean;
/**
 * Write a key-value-pair to the shared memory associated with the
 * current conrete application context. Appends the application
 * specific key implicitly.
 * @param purposeKey Key related to a specific purpose
 * @param purposeData Data stored for specific purpose
 */
export function writeSync(purposeKey: any, purposeData: any): Promise<void>;
/**
 * Asynchronous wrapper for shared memory write.
 * @returns Promise resolving once the data has been written to shared memory
 */
export function write(purposeKey: any, purposeData: any): Promise<any>;
/**
 * Read a value from the shared memory associated with the
 * current conrete application context and a given purpose key.
 * Appends the application specific key implicitly.
 * @param purposeKey Key related to a specific purpose
 * @returns Data stored for specific purpose
 */
export function readSync(purposeKey: any): any;
/**
 * Asynchronous wrapper for shared memory read.
 * @returns Promise resolving to the data read from shared memory
 */
export function read(purposeKey: any): Promise<any>;
/**
 * Register the concrete application specific abstracted low-level
 * shared memory for being freed once the related process emits a
 * given event (e.g. upon 'exit').
 * @param event Event name(s) to bind free call to
 */
export function registerFree(event: any): void;
/**
 * Get the current comncrete application shared memory key.
 * SERVES TEST PURPOSES ONLY.
 * @returns Numerical application key
*/
export function getConcreteAppKey(): number;
