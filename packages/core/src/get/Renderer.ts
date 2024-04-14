type TPathMapCallback = (path: string) => string;
type TDataMapCallback = (data: string|Buffer) => string|Buffer;


export class Renderer {
    public readonly isReverse: boolean = false;

    private pathMapCallback: TPathMapCallback;
    private dataMapCallback: TDataMapCallback;

    constructor(reverse: boolean = false) {
        this.isReverse = reverse;
    }
    
    public pathMapping(callback: TPathMapCallback) {
        this.pathMapCallback = callback;
    }

    public applyPathMapping(path: string): string {
        return this.pathMapCallback(path);
    }

    public dataMapping(callback: TDataMapCallback) {
        this.dataMapCallback = callback;
    }

    public applyDataMapping(data: Buffer|string): Buffer|string {
        return this.dataMapCallback(data);
    }
}