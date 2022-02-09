
import { TemplatingRenderer } from "./TemplatingRenderer";
import { LocaleRenderer } from "./LocaleRenderer";


export function render(markup: string, isImplicitRequest?: boolean) {
	markup = TemplatingRenderer.render(markup, isImplicitRequest);
	markup = LocaleRenderer.render(markup, isImplicitRequest);

	return markup;
}