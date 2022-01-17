/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
(()=>{function e(o,...e){console.log.apply(null,["%c[rJS] %c"+o,"color: #E0DD00;","color: auto;"].concat(e))}let n=o=>{e("Server has been %cshut down","color: #FF4747; font-style: italic;"),e("Perform manual reload to resubscribe when server has been restarted")};const t=new WebSocket("ws://localhost:9393");t.onopen=o=>{e("Running DEV MODE"),e("Subscribed to %cautomatic reload %cupon changes","color: #00DE7E; font-style: italic;","color: auto;"),t.onmessage=o=>{document.location.reload()},t.onclose=o=>{setTimeout(n||(o=>{}),500)}},document.addEventListener("beforeunload",o=>{n=null})})();