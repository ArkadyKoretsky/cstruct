import { ReadBufferBE } from "./read-buffer-be";
import { ReadBufferLE } from "./read-buffer-le";
import { SpecialType, StructEntry, Type } from "./types";
import { ReadWriteBase } from "./read-write-base";


export class Read<T> extends ReadWriteBase {
    protected _struct: T;
    protected _reader: ReadBufferLE | ReadBufferBE;

    _recursion(struct: T) {
        const entries: StructEntry[] = Object.entries(struct);

        for (const [modelKey, modelType] of entries) {
            // Catch dynamic key
            const keyDynamicGroups = this._getTypeLengthGroupsMatch(modelKey);

            // Dynamic key
            if (keyDynamicGroups) {
                delete struct[modelKey];
                const {dynamicType, dynamicLength} = keyDynamicGroups;
                this._readDynamicOrStatic(struct, modelType as string, dynamicType, dynamicLength, modelType as string, dynamicType);
                continue;
            }

            // Dynamic type
            if (typeof modelType === 'string') {
                // Catch dynamic type
                const typeDynamicGroups = this._getTypeLengthGroupsMatch(modelType);

                if (typeDynamicGroups) {
                    const {dynamicType, dynamicLength} = typeDynamicGroups;
                    this._readDynamicOrStatic(struct, dynamicType, dynamicType, dynamicLength, dynamicType, modelKey);
                    continue;
                }
            }

            // Static item
            this._read(struct, modelKey, modelType);
        }
    }

    private _readDynamicOrStatic(struct: T, modelType: string, dynamicType: string, dynamicLength: string, readType: string, structKey: string) {
        // Dynamic key
        // 1 (some.i16: u8)
        // 2 (some.5  : u8)
        // Dynamic type
        // 1 (u8.i16) (<dynamicType>.<dynamicLength>)
        // 2 (u8.5)   (<dynamicType>.<dynamicLength>)

        const {
            specialType,
            isStatic,
            staticSize
        } = this.extractTypeAndSize(modelType, dynamicLength);

        // Size, get or read
        const size = isStatic
            ? staticSize
            : this._reader.read(dynamicLength) as number;

        if (size === 0 && specialType === SpecialType.Buffer) {
            throw new Error(`Buffer size can not be 0.`);
        }

        // Read string or buffer or json
        if (specialType) {
            const value = this._reader.read(readType, size);
            struct[structKey] = specialType === SpecialType.Json ? JSON.parse(value as string) : value;
        }

        // Read array of itemsType
        else {
            this._readArray(readType, struct, structKey, size);
        }
    }

    private _read(struct: T, key: string, type: Type) {
        switch (typeof type) {
            case 'object':
                this._recursion(struct[key]);
                break;
            case 'string':
                struct[key] = this._reader.read(type);
                break;
            default:
                throw TypeError(`Unknown type "${type}"`);
        }
    }

    private _readArray(itemsType: Type, struct: T, dynamicKey: string, size: number) {
        switch (typeof itemsType) {
            case 'object': {
                const json = JSON.stringify(itemsType);
                struct[dynamicKey] = Array(size).fill(0).map(() => JSON.parse(json));
                this._recursion(struct[dynamicKey]);
                break;
            }
            case 'string':
                struct[dynamicKey] = Array(size).fill(itemsType);
                this._recursion(struct[dynamicKey]);
                break;
            default:
                throw TypeError(`Unknown type "${itemsType}"`);
        }
    }

    toStruct(): T {
        return this._struct;
    }

    get size() {
        return this._reader.size;
    }

    get offset() {
        return this._reader.offset;
    }
}