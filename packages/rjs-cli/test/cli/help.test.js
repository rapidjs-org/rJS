// TODO: Enhance CLI testing for partial stdout/-err matching
new CLITest("Print help")
.actual("./rjs.sh", [ "help" ])
.expected({
    stdout: [
        "\u001b[1m\u001b[3m\u001b[48;2;255;250;195m\u001b[38;2;0;0;0m \u001b[38;2;255;97;97mr\u001b[39m\u001b[38;2;0;0;0mJS\u001b[39m \u001b[0m ..."
    ]
});