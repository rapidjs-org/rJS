interface ILastMessage {
    count: number;
    message: string;
    timePivot: number;
}


export abstract class ALogControl {

    private static readonly lastMessage: ILastMessage = {
        count: 0,
        message: null,
        timePivot: 0
    };
    
    public static getGroupCount(message: string): number {
        if(message !== ALogControl.lastMessage.message
        || (Date.now() - ALogControl.lastMessage.timePivot) > 30000) {
    
            ALogControl.lastMessage.count = 1;
            ALogControl.lastMessage.message = message;
            ALogControl.lastMessage.timePivot = Date.now();
    
            return 1;
        }
        
        ALogControl.lastMessage.timePivot = Date.now();

        return ++ALogControl.lastMessage.count;
    }
    
    public abstract stdout(message: string, groupCount: number): string;
    public abstract stderr(message: string, groupCount: number): string;
    
}