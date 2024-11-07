import { Printer } from "../.shared/Printer";

export const DEV_MODE_PREFIX: string = `${Printer.format("DEV", [1, Printer.escapes.PRIMARY_COLOR_FG])} `;
