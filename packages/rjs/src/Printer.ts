import _config from "./_config.json";


type TStdChannel =  "stdout" | "stderr";


export class Printer {
    private static readonly brandSequence: string
    = Printer.format(` ${_config.brand} `, [ 1, 3, "48;2;255;245;161", "38;2;0;0;0" ]);

    public static format(message: string,
        openCodes: number|string|(number|string)[],
        closeCodes: number|string|(number|string)[] = 0) {
        const encode = (codes: number|string|(number|string)[]) => {
            return [ codes ].flat()
            .map((code: number|string) => `\x1b[${code}m`)
            .join("");
        };
        return [
            encode(openCodes),
            message,
            encode(closeCodes),
        ].join("");
    }

    private readonly last: {
        channel: TStdChannel;
        message: string;
        timestamp: number;
    } = {
        message: null,
        channel: null,
        timestamp: -Infinity
    };

    private print(message: string, channel: TStdChannel, withBrandSequence: boolean = true) {
        const nowTimestamp: number = Date.now();

        if(this.last.channel === channel
        && this.last.message === message
        && (nowTimestamp - this.last.timestamp) < 3000) {
            this.last.timestamp = nowTimestamp;

            // TODO: Increment print counter

            return;
        }

        process[channel].write([
            withBrandSequence ? Printer.brandSequence + " " : "",
            message
        ].join(""));
        
        this.last.channel = channel;
        this.last.message = message;
        this.last.timestamp = Date.now();
    }

    public stdout(message: string, withBrandSequence: boolean = true) {
        this.print(message, "stdout", withBrandSequence);
    }

    public stderr(message: string, withBrandSequence: boolean = true) {
        this.print(message, "stderr", withBrandSequence);
    }
}