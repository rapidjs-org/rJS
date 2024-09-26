require("../deps.json")
.forEach(package => {
    try {
        require("child_process")
        .execSync(`npm run ${process.argv.slice(2)[0]} -w ${package}`, {
            cwd: require("path").join(__dirname, ".."),
            stdio: "inherit"
        });
    } catch(err) {
        console.error(((err ?? {}).stderr ?? err).toString());

        process.exit(1);
    }
});