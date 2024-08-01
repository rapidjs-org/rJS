export function execFromEcosystem(packageSpecifier: {
    name: string;
    member: string;
}, ...args: unknown[]) {
    // TODO: Lazy dependency install
    
    const packageApi: {
        [ member: string ]: () => unknown;
    } = require(`@rapidjs.org/${packageSpecifier.name}`);

    const member: () => unknown = packageApi[packageSpecifier.member];

    return member.apply(null, args);
}