export declare class PortMemory {
    private static configPath;
    private static getPortAssociatedPath;
    private static readFromMemory;
    private static writeToMemory;
    static get(associatedPort: number, key: string): string;
    static set(associatedPort: number, key: string, value: unknown): void;
    static has(associatedPort: number): boolean;
    static delete(associatedPort: number, key: string): void;
    static clear(associatedPort: number): void;
}
//# sourceMappingURL=PortMemory.d.ts.map