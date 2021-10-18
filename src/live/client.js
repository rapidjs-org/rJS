(_ => {

	function log(message, ...args) {
		console.log.apply(null, [`%c[rJS] %c${message}`, "color: #E0DD00;", "color: auto;"].concat(args));
	}
	
	
	let logCloseMessage = _ => {
		log("Server has been %cshut down", "color: #FF4747; font-style: italic;");
		log(`Perform manual reload to resubscribe when server has been restarted`);
	};


	const ws = new WebSocket("ws://localhost:9393");
	

	ws.onopen = _ => {
		log("Running DEV MODE");
		log("Subscribed to %cautomatic reload %cupon changes", "color: #00DE7E; font-style: italic;", "color: auto;");
	
		ws.onmessage = _ => {
			document.location.reload();
		};
		
		ws.onclose = _ => {
			setTimeout(logCloseMessage || (_ => {}), 500);
		}
	};

	document.addEventListener("beforeunload", _ => {
		logCloseMessage = null;
	});
	
})();