import _config from "./_config.json";


type TStdChannel =  "stdout" | "stderr";


interface IPrinterOptions {
	replicatedMessage?: boolean;
	withBrandSequence?: boolean;
}


export class Printer {
	private static readonly brandSequence: string
		= Printer.format(` ${
			Printer.format("r", [ "38;2;255;97;97" ], 39)
		}${
			Printer.format("JS", [ "38;2;0;0;0" ], 39)
		} `, [ 1, 3, "48;2;255;250;195", "38;2;0;0;0" ]);

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

	private print(message: string, channel: TStdChannel, options: IPrinterOptions = {}) {
		const optionsWithDefaults: IPrinterOptions = {
			replicatedMessage: false,
			withBrandSequence: true,

			...options
		};

		const nowTimestamp: number = Date.now();

		if(this.last.channel === channel
        && this.last.message === message
        && Math.abs(nowTimestamp - this.last.timestamp) < 3000) {
			this.last.timestamp = nowTimestamp;
			
			// TODO: Increment print counter
			
			return;
		}

		process[channel].write([
			optionsWithDefaults.withBrandSequence ? Printer.brandSequence + " " : "",
			optionsWithDefaults.replicatedMessage
				? message.replace(/\n?$/, "\n")
				: `${message}\n`
		].join(""));
		
        
		this.last.channel = channel;
		this.last.message = message;
		this.last.timestamp = Date.now();
	}

	public stdout(message: string, options: IPrinterOptions = {}) {
		this.print(message, "stdout", options);
	}

	public stderr(err: Error|string, options: IPrinterOptions = {}) {
		const message: string = Printer.format(
			((err instanceof Error) ? (err.stack ?? err.message) : err)
			.replace(/^(([A-Z][a-z]*)*Error: *[^\n]+)((\s|.)+)$/, `$1${
				Printer.format("$3", [ 2 ], 22)
			}`),
			[ 31 ], 39
		);
		
		this.print(message, "stderr", options);
	}
}