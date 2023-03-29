/**
 * Module containing sub-dependent utility functions for
 * supporting reuse in related, but arbitrary (sub-)contexts.
 */


import { EmbedContext } from "./EmbedContext";


/**
 * Log streamlined global hostname configuration.
 * e.g.: { example.com, example.net, localhost } → example.com(+2)
 */ 
export function captionEffectiveHostnames(): string {
    return `${
        EmbedContext.global.hostnames[0]
    }${(
        EmbedContext.global.hostnames.length > 1)
        ? `(+${EmbedContext.global.hostnames.length - 1})`
        : ""
    }`;
}