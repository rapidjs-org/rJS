import { http } from "../../build/mod.js";

export function setup() {
    return http.serve({
        port: 7777
    }, req => {
        return {
            body: req.method,
            status: 500
        }
    });
}