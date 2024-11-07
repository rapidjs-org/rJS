import { Args } from "./Args";
import { Options } from "./Options";

type TStdChannel = "stdout" | "stderr";

interface IPrinterOptions {
    replicatedMessage?: boolean;
    withBrandSequence?: boolean;
}

export class Printer {
    public static readonly escapes = {
        DARK_COLOR_FG: "38;2;0;0;0",
        GRAY_COLOR_FG: "38;2;133;133;153",
        PRIMARY_COLOR_FG: "38;2;255;97;97",
        SECONDARY_COLOR_BG: "48;2;255;250;195",
        TERTIARY_COLOR_FG: "38;2;136;82;224"
    };
    private static readonly brandSequence: string = Printer.format(
        ` ${Printer.format("r", [Printer.escapes.PRIMARY_COLOR_FG], 39)}${Printer.format(
            "JS",
            Printer.escapes.DARK_COLOR_FG,
            39
        )} `,
        [1, 3, Printer.escapes.SECONDARY_COLOR_BG]
    );
    public static readonly global: Printer = new Printer();
    
    public static format(
        message: string,
        openCodes: number | string | (number | string)[],
        closeCodes: number | string | (number | string)[] = 0
    ) {
        const encode = (codes: number | string | (number | string)[]) => {
            return [codes]
                .flat()
                .map((code: number | string) => `\x1b[${code}m`)
                .join("");
        };
        return [encode(openCodes), message, encode(closeCodes)].join("");
    }

    public static prefixWithBrandSequence(sequence: string): string {
        return `${Printer.brandSequence} ${sequence}`;
    }

    public static indentWithBrandSequence(sequence: string): string {
        return `${" ".repeat(Printer.brandSequence.replace(/\x1b\[\d+(;\d+)*m/g, "").length + 1)}${sequence}`;
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
    
    private print(
        message: string,
        channel: TStdChannel,
        options: IPrinterOptions = {}
    ) {
        const optionsWithDefaults: IPrinterOptions = new Options(options, {
            replicatedMessage: false,
            withBrandSequence: true
        }).object;

        const nowTimestamp: number = Date.now();

        if (
            this.last.channel === channel &&
            this.last.message === message &&
            Math.abs(nowTimestamp - this.last.timestamp) < 3000
        ) {
            this.last.timestamp = nowTimestamp;

            // TODO: Increment print counter

            return;
        }

        let formattedMessage: string = optionsWithDefaults.replicatedMessage
            ? message.replace(/\n?$/, "\n")
            : `${message}\n`;
        formattedMessage = optionsWithDefaults.withBrandSequence
            ? Printer.prefixWithBrandSequence(formattedMessage)
            : formattedMessage;

        process[channel].write(formattedMessage);

        this.last.channel = channel;
        this.last.message = message;
        this.last.timestamp = Date.now();
    }

    public stdout(message: string, options: IPrinterOptions = {}) {
        this.print(
            message.replace(/([^.?!:;])(\n|\r)$/, "$1.$2"),
            "stdout",
            options
        );
    }

    public stderr(err: Error | string, options: IPrinterOptions = {}) {
        const message: string = Printer.format(
            (err instanceof Error
                ? Args.parseFlag("stacktrace")
                    ? (err.stack ?? err.message)
                    : err.message
                : err
            )
                .replace(
                    /^(([A-Z][a-z]*)*Error:)/,
                    Printer.format("$1", [2], 22)
                )
                .replace(/^([^\n]*[^.?!:;])( *\n)/, "$1.$2"),
            [31],
            39
        );

        this.print(message, "stderr", options);
    }
}
