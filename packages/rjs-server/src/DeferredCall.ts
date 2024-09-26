export class DeferredCall {
	private deferredCallback: () => void;
	private deferredEvents: number;

	constructor(
		deferredCallback: () => void = () => null,
		deferredEvents: number = 1
	) {
		this.deferredCallback = deferredCallback;
		this.deferredEvents = deferredEvents;
	}

	public call(deferredCallbackOverride?: () => void) {
		this.deferredCallback =
            deferredCallbackOverride ?? this.deferredCallback;

		if (--this.deferredEvents !== 0) return;

		this.deferredCallback();
	}
}
