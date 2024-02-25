export class ProgressLine {
    private readonly message: string;
    private readonly max: number;
    private readonly symbol: string;
    private readonly intervalSize: number;

    private i: number = 0;
    private interval: NodeJS.Timeout;

    constructor(message: string, max: number = 3, symbol = ".", intervalSize: number = 375) {
        this.message = message;
        this.max = max + 1;
        this.symbol = symbol;
        this.intervalSize = intervalSize;
    }

    public activate(): this {
        this.interval = setInterval(() => {
            process.stdout.write("\x1b[2K\r\x1b[?25l");
            process.stdout.write(`${this.message} ${
                Array.from({ length: (this.i++ % this.max) }, () => this.symbol).join("")
            }`);
        }, this.intervalSize)
        .unref();
        
        return this;
    }

    public deactivate(): this {
        clearInterval(this.interval);

        process.stdout.write("\x1b[2K\r\x1b[?25h");

        return this;
    }
}