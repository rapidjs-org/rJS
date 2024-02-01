new RequestTest("Excessive URI length")
.actual(`/${Array.from({ length: 500 }, () => "a").join("")}`).expected({
    status: 414
});

new RequestTest("Unsupported method")
.actual("/", {
    method: "PUT"
}).expected({
    status: 405
});