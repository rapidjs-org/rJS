import { parseOption } from "./args";


export const PORT = parseOption("port", "P").number ?? 80;    // TODO: HTTP or HTTPS (80, 443)
