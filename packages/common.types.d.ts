export type TAtomic = string|number|boolean;
export type TJSON = { [ key: string ]: TAtomic|TAtomic[]|TJSON; };
export type TSerializable = TAtomic|TJSON;

export type TStatus = number;