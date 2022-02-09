declare type RenderingCallback = (message: string, handlerObj?: Record<string, unknown>, req?: IRequestObject) => string;

declare interface IRenderingEngine {
    implicitReadingOnly: boolean;
    
    callback: RenderingCallback;
}