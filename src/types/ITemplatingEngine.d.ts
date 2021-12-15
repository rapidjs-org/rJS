declare interface ITemplatingEngine {
    implicitReadingOnly: boolean;
    
    callback: (message: string, handlerObj?: Record<string, unknown>, req?: IReducedRequestInfo) => string;
}