import { parentPort, BroadcastChannel } from "worker_threads";

import { handle, terminate } from "app";


new BroadcastChannel("worker-broadcast-channel")
.onmessage = (event: { data: string }) => {
	if(event.data !== "terminate") return;
	
	terminate();
};


parentPort.on("message", handle);

// TODO: Fix log intercept (global)