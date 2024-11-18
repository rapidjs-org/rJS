export const CONSTANT = "value1";

export function sum__declaration(a, b) { return a + b; };

export const sum__expression = (a, b) => a + b;

export function sumWithContext(a, CONTEXT, b) {
    return `${CONTEXT.clientIP} | ${a + b}`;
}