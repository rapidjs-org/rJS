new RequestTest("Success")
.actual("/").expected({
    status: 200,
    headers: {
        "Server": "rJS"
    }
});

new RequestTest("Excessive URL")
.actual(`/${"a".repeat(250)}`).expected({
    status: 414
});

new RequestTest("Excessive Headers")
.actual("/", {
    headers: {
        "a": "a".repeat(750 - 3),
        "b": 1
    }
}).expected({
    status: 432
});