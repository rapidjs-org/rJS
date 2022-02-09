/**
 * Accordingly ordered application of bound renderers.
 */


import { TemplatingRenderer } from "./TemplatingRenderer";
import { LocaleRenderer } from "./LocaleRenderer";


/**
 * Apply renderers ("render") in order of registration.
 * 1. Templating, 2. Locale (as templating might change locale information)
 * @param markup 
 * @param isImplicitRequest 
 * @returns 
 */
export function render(markup: string, isImplicitRequest?: boolean) {
	markup = TemplatingRenderer.render(markup, isImplicitRequest);
	markup = LocaleRenderer.render(markup, isImplicitRequest);

	return markup;
}