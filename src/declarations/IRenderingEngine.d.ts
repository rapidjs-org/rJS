declare interface IRenderingEngine {
    implicitReadingOnly: boolean;
    
    callback: (message: string, handlerObj?: Record<string, unknown>, req?: IRequestObject) => string;
}