const ws = new WebSocket("ws://localhost:9393");

ws.onopen = _ => {
	console.log("%c[rJS]%cRunning DEV MODE", "color: #E0DD00;");
};

ws.onmessage = _ => {
	document.location.reload();
};