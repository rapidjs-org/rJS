declare interface IModuleConstructor extends Function {
    _resolveFilename: (reference: string, module: NodeJS.Module) => string;
}