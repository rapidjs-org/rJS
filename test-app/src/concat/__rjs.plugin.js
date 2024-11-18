export default function(rJS, pluginFilesystem, pluginConfig) {
    const contents = [ pluginConfig.option1 ];
    pluginFilesystem
    .traverse(file => {
        contents.push(file.contents);
    });
    return new rJS.File("./out.txt", contents.join("\n"));
}