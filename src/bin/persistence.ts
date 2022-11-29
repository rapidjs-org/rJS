import { join } from "path";
import { writeFile } from "fs";


// TODO: Implement
writeProxyFile();

function writeProxyFile() {
    writeFile(join(__dirname, "./7070.rjs.proxy"), Buffer.from("111 awdw dwaad"), null, (err: Error) => {
        if(!err) {            
            return;
        }

        console.error(err);
        
        // TODO: Handle
    });
}

function deleteProxyFile() {

}