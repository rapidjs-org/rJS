declare interface IRenderingEngine {
    implicitReadingOnly: boolean;
    
    callback: (message: string, handlerObj?: Record<string, unknown>, req?: IReducedRequestInfo) => string;
}