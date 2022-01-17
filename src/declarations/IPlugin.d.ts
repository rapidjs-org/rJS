declare interface IPlugin {
    path: string;
    specific: boolean;

    clientScript?: Buffer;
    compoundOnly?: boolean;
}