import { Interface } from "readline";

import { Printer } from "../.shared/Printer";

export class InputReader extends Interface {
    constructor() {
        super(process.stdout, process.stderr);
    }

    questionPromise(question: string): Promise<string> {
        return new Promise((resolve) => {
            super.question(
                Printer.prefixWithBrandSequence(
                    `${Printer.format(
                        question.trim().replace(/([^.:?!])$/, "$1:"),
                        Printer.escapes.GRAY_COLOR_FG,
                        39
                    )} `
                ),
                (answer: string) => {
                    resolve(answer);
                }
            );
        });
    }
}
