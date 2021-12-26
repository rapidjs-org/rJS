declare interface ITemplatingEngine {
    index: number;
    implicitReadingOnly: boolean;
    
    callback: (message: string, handlerObj?: Record<string, unknown>, req?: IReducedRequestInfo) => string;
}