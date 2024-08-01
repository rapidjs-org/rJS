export class DeferredCall {
	private deferredEvents: number;
	private deferredCallback: () => void;

	constructor(deferredEvents: number = 1) {
		this.deferredEvents = deferredEvents;
	}

	public call(deferredCallback?: () => void) {
		this.deferredCallback = deferredCallback || this.deferredCallback;

		if(--this.deferredEvents !== 0 || !this.deferredCallback) return;

		this.deferredCallback();
	}
}