const sharedMemory = require("../../debug/core/shared-memory/api.shared-memory");


setInterval(_ => {}, 5000); // Keep alive


process.on("message", consistencyStr => {
    const referenceData = [
        `Hello worlδ! ${consistencyStr}`,   // with 2B delta character (uint16(to 2x8) split) and random part in order to ensure consitency among runs
        "Hello mars; larger entry data"
    ];

    if(!process.argv.slice(2).includes("--read")) {
        // WRITE PROCESS
        logProcess("P1");

        sharedMemory.writeSync("exists", referenceData[0]);
        
        log(`[ SHM : ${sharedMemory.getConcreteAppKey()} : "exists" ] WRITE -> '${referenceData[0]}'`);

        process.send("");
        
        return;
    }

    // READ PROCESS
    logProcess("\nP2");
    
    setTimeout(_ => {
        try {
            const dataNotExists = sharedMemory.readSync("notExists");
            log(`[ SHM : ${sharedMemory.getConcreteAppKey()} : "exists" ] READ -> ${dataNotExists}`);

            const dataWrittenExists = sharedMemory.readSync("exists");
            log(`[ SHM : ${sharedMemory.getConcreteAppKey()} : "exists" ] READ -> '${dataWrittenExists}'`);
            
            sharedMemory.writeSync("exists", referenceData[1]);
            log(`[ SHM : ${sharedMemory.getConcreteAppKey()} : "exists" ] REWRITE -> '${referenceData[1]}'`);

            const dataRewrittenExists = sharedMemory.readSync("exists");
            log(`[ SHM : ${sharedMemory.getConcreteAppKey()} : "exists" ] (RE)READ -> '${dataRewrittenExists}'`);

            process.send(
                dataNotExists === null
                && dataWrittenExists === referenceData[0]
                && dataRewrittenExists === referenceData[1]
            );    // Result
        } catch(err) {
            console.error(err);
        }
    }, 1000);
});


function log(message) {
    console.log(`\x1b[2m${message}\x1b[0m`);
}

function logProcess(name) {
    console.log(`\x1b[2m\x1b[1m\x1b[34m${name}\x1b[0m`);
}