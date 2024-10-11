import { TJSON } from "./.shared/global.types";
import { Options } from "./.shared/Options";

export class TypeResolver {
    private readonly obj: TJSON;

    constructor(obj: TJSON, defaultsObj: TJSON = {}) {
        this.obj = new Options(obj, defaultsObj).object;
    }

    public read(...nestedKeys: string[]) {
        let obj: TJSON = this.obj;
        for (const key of nestedKeys) {
            obj = obj[key] as TJSON;

            if (obj === undefined) break;
        }

        const isSet: boolean = ![undefined, null].includes(obj);
        return {
            object(): TJSON {
                return isSet ? obj : null;
            },
            string(): string {
                return isSet ? (obj as unknown as string).toString() : null;
            },
            number(): number {
                return isSet
                    ? parseFloat((obj as unknown as number).toString())
                    : null;
            },
            boolean(): boolean {
                return isSet
                    ? (obj as unknown as boolean).toString() === "true"
                    : null;
            }
        };
    }
}
