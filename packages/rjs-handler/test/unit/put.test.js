
const { createHmac } = require("crypto");

const { request } = require("./_api");

new UnitTest("PUT GitHub:/other ")
.actual(request({
    method: "PUT",
    url: "/other",
    headers: {
        "User-Agent": "GitHub-Hookshot/044aadd"
    }
}, [], true))
.expect({
    status: 404
});

new UnitTest("PUT GitHub:/ unsupported git remote platform (User-Agent)")
.actual(request({
    method: "PUT",
    url: "/",
    headers: {
        "User-Agent": "GitHub-Hookshot/044aadd"
    }
}, [], true))
.expect({
    status: 404
});

const SECRET = "secret";
const PAYLOAD = JSON.stringify({
    isDryRun: true,
    foo: "bar"
});

new UnitTest("PUT GitHub:/ failed authentication")
.actual(request({
    method: "PUT",
    url: "/",
    headers: {
        "User-Agent": "GitHub-Hookshot/044aadd",
        "X-Hub-Signature-256": `sha256=${
            createHmac("sha256", SECRET)
            .update(PAYLOAD)
            .digest("hex")
        }`
    }
}, [], true))
.expect({
    status: 403
});

new UnitTest("PUT GitHub:/ failed authentication")
.actual(request({
    method: "PUT",
    url: "/",
    headers: {
        "User-Agent": "GitHub-Hookshot/044aadd",
        "X-Hub-Signature-256": `sha256=${
            createHmac("sha256", SECRET)
            .update(PAYLOAD)
            .digest("hex")
        }`
    },
    body: PAYLOAD
}, [], true))
.expect({
    status: 200
});