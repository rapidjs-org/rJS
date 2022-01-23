section("Markup utils");

const markup = require("../dist/utilities/markup");

const deflate = str => {
    return str.replace(/[>]\s+/g, ">").trim();
};

test("Injects character sequece into given markup string's head tag as child content",
deflate(markup.injectIntoHead(`
<html>
    <head>
        <title>Test</title>
    </head>
    <body>
        <h1>Test</h1>
    </body>
</html>
`, "<!-- TEST -->"))).for(deflate(`
<html>
    <head>
        <title>Test</title>
        <!-- TEST -->
    </head>
    <body>
        <h1>Test</h1>
    </body>
</html>
`));

test("Injects character sequece into given markup string's head tag as child content",
deflate(markup.injectIntoHead(`
<html>
    <head>
        <script src="./script.js"></script>
        <title>Test</title>
    </head>
    <body>
        <h1>Test</h1>
    </body>
</html>
`, "<!-- TEST -->"))).for(deflate(`
<html>
    <head>
        <!-- TEST -->
        <script src="./script.js"></script>
        <title>Test</title>
    </head>
    <body>
        <h1>Test</h1>
    </body>
</html>
`));

test("Returns given markup unaffected as no head tag present",
deflate(markup.injectIntoHead(`
<html>
    <body>
        <h1>Test</h1>
    </body>
</html>
`, "<!-- TEST -->"))).for(deflate(`
<html>
    <body>
        <h1>Test</h1>
    </body>
</html>
`));