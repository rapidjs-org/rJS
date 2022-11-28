import { resolve } from "path";
import { writeFile } from "fs";


// TODO: Implement
writeProxyFile();

function writeProxyFile() {
    writeFile(resolve("./7070.rjs.proxy"), Buffer.from("111 awdw dwaad"), null, (err: Error) => {
        if(!err) {            
            return;
        }

        console.error(err);
        
        // TODO: Handle
    });
}

function deleteProxyFile() {

}