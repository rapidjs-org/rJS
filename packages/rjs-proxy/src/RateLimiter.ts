export class RateLimiter {
    private readonly limit: number;
    private readonly memory: {
        [ clientId: string ]: number;
    } = {};

    constructor(limit: number) {
        this.limit = limit;
    }

    public mustBlock(clientId: string) {
        if(this.memory[clientId] > this.limit)
            return true;
        
        this.memory[clientId] = (this.memory[clientId] ?? 0) + 1;

        return false;
    }
}