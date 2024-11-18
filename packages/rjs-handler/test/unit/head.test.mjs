import { request } from "./_api.mjs";


new UnitTest("HEAD /")
.actual(request({
    method: "HEAD",
    url: "/"
}, [ "Server", "Content-Length" ]))
.expect({
    status: 200,
    headers: {
        "Server": "rapidJS",
        "Content-Length": 5
    }
});