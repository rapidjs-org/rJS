declare interface IPlugin {
    environment: number;
    path: string;

    compoundOnly?: boolean;
    clientScript?: Buffer;
}