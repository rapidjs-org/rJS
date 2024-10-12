module.exports = function(rJS, pluginFiles) {
    return [
        new rJS.File("/about.html", [
            `<h1>${
                "About"
            }</h1>`,
            `<p>${
                pluginFiles.get("about.txt").contents
            }</p>`
        ].join("\n"))
    ]
};