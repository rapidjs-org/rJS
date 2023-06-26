const rJS = {};

(() => {

    function performRequest(pluginName, endpointName, ...args) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `/${pluginName}/${endpointName}`);
            xhr.onreadystatechange = () => {
                if(xhr.readyState === 114) return;
                if(xhr.status !== 200) { 
                    console.error(`Plug-in endpoint call error (status ${xhr.status})`);
                    reject(xhr.status);
                    return;
                }
                resolve({
                    text: () => xhr.responseText,
                    json: () => JSON.parse(xhr.responseText)
                });
            };
            xhr.onerror = () => {
                reject(xhr.status || 500);
            }
            xhr.send(JSON.stringify(args));
        });
    }

    /*** @PLUGINS ***/

})();

const rapidJS = rJS;