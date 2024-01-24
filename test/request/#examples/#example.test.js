new RequestTest("Example GET")
.actual("/hello-world").expected("Hello world!")
.actual("/hello-mars").expected({
    "foo": "baz"
});

new RequestTest("Example POST")
.actual("/hello-world", {
    method: "POST"
}).expected({
    headers: {
        "Content-Encoding": "gzip"
    },
    message: "Hello world!"
});