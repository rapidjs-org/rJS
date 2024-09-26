module.exports = (rJS, pluginFilesystem, pluginConfig, pluginOptions) => {
    const contents = [ (pluginOptions ?? {}).option1 ?? pluginConfig.option1 ];
    
    pluginFilesystem
    .traverse(file => {
        contents.push(file.contents);
    });
    
    return new rJS.File("./out.txt", contents.join("\n"));
};