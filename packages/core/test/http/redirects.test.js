new HTTPTest("Redirect: /index.html")
.eval("/index.html")
.expect({
    headers: {
        "Location": "/"
    },
    status: 302
});

new HTTPTest("Redirect: /index")
.eval("/index")
.expect({
    headers: {
        "Location": "/"
    },
    status: 302
});

new HTTPTest("Redirect: /other.html")
.eval("/other.html")
.expect({
    headers: {
        "Location": "/other"
    },
    status: 302
});