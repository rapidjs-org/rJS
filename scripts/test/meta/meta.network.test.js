assertEquals("Test GET Atomic – Match", {
    method: "GET",
    url: "http://localhost:8080/abc"
}, "def");

assertEquals("Test GET Atomic – Mismatch (message)", {
    method: "GET",
    url: "http://localhost:8080/abc"
}, 123);

assertEquals("Test GET Atomic – Mismatch (endpoint)", {
    method: "GET",
    url: "http://localhost:8080/def"
}, "def");

assertEquals("Test GET Atomic – Mismatch (method)", {
    method: "POST",
    url: "http://localhost:8080/def"
}, "def");

assertEquals("Test GET Object – Match", {
    method: "PUT",
    url: "http://localhost:8080/abc"
}, {
    message: "def"
});

assertEquals("Test GET Object – Mismatch", {
    method: "PUT",
    url: "http://localhost:8080/abc"
}, {
    message: 123
});

assertEquals("Test GET Status – Match", {
    method: "POST",
    url: "http://localhost:8080/"
}, {
    status: 405
});

assertEquals("Test GET Status – Mismatch", {
    method: "POST",
    url: "http://localhost:8080/"
}, {
    status: 200
});