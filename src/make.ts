import { Model, SpecialType, StructEntry, Type, WriterValue } from "./types";
import { WriteBufferLE } from "./write-buffer-le";
import { WriteBufferBE } from "./write-buffer-be";
import { ReadWriteBase } from "./read-write-base";

export class Make<T> extends ReadWriteBase {
    protected _writer: WriteBufferLE | WriteBufferBE;

    _recursion(model: Model, struct: T) {
        const entries: StructEntry[] = Object.entries(model);

        for (const [modelKey, modelType] of entries) {
            // Catch key.length
            const keyLengthGroups = this._getTypeLengthGroupsMatch(modelKey);

            // Dynamic key
            if (keyLengthGroups) {
                const {dynamicType, dynamicLength} = keyLengthGroups;
                this._writDynamicOrStatic(struct, modelType as string, dynamicLength, dynamicType, modelType as string);
                continue;
            }

            // Dynamic type
            if (typeof modelType === 'string') {
                // Catch dynamic type
                const typeDynamicGroups = this._getTypeLengthGroupsMatch(modelType);

                if (typeDynamicGroups) {
                    const {dynamicType, dynamicLength} = typeDynamicGroups;
                    this._writDynamicOrStatic(struct, dynamicType, dynamicLength, modelKey, dynamicType);
                    continue;
                }
            }

            // Static item
            this._write(model, struct, modelKey, modelType);
        }
    }

    private _writDynamicOrStatic(struct: T, modelType: string, dynamicLength: string, structKey: string, writeType: string) {
        // Dynamic key
        // Dyn (some.i16: u8) (<dynamicType>.<dynamicLength>: <modelType>) data = {abc: 'j[i8]'} modelType = u8
        // Sta (some.5  : u8) (<dynamicType>.<dynamicLength>: <modelType>) data = {abc: 'j[9]'}  modelType = u8
        // Dynamic type
        // Dyn (u8.i16) (<dynamicType>.<dynamicLength>) data = ['j[i8]'] modelType = u8
        // Sta (u8.5)   (<dynamicType>.<dynamicLength>) data = ['j[9]']  modelType = u8

        const {
            specialType,
            isStatic,
            staticSize
        } = this.extractTypeAndSize(modelType, dynamicLength);

        let structValues = struct[structKey];
        if (specialType === SpecialType.Json) {
            structValues = JSON.stringify(structValues);
        }

        if (isStatic && staticSize !== 0 && structValues.length > staticSize  && specialType !== SpecialType.String) {
            throw new Error(`Size of value ${structValues.length} is greater than ${staticSize}.`);
        }

        const size = isStatic
            ? staticSize
            : structValues.length;

        if (size === 0 && specialType === SpecialType.Buffer) {
            throw new Error(`Buffer size can not be 0.`);
        }

        // Dynamic, write size before value
        if (!isStatic) {
            this._writer.write(dynamicLength, size);
        }

        // Write string or buffer or json
        if (specialType) {
            // this._writer.write(writeType, structValues, isStatic && (passSize || size === 0) ? size : undefined);
            this._writer.write(writeType, structValues, isStatic ? size : undefined);
        }

        // Write array of writeType
        else {
            this._writeArray(writeType, structValues);
        }
    }

    private _write(model: Model, struct: T, modelKey: string, modelType: Type) {
        switch (typeof modelType) {
            case 'object':
                this._recursion(model[modelKey], struct[modelKey]);
                break;
            case 'string':
                this._writer.write(modelType, struct[modelKey]);
                break;
            default:
                throw TypeError(`Unknown type "${modelType}"`);
        }
    }

    private _writeArray(itemsType: Type, structValues: T[]) {
        switch (typeof itemsType) {
            case 'object':
                for (const structValue of structValues) {
                    this._recursion(itemsType, structValue);
                }
                break;
            case 'string':
                for (const structValue of structValues) {
                    this._writer.write(itemsType, structValue as WriterValue);
                }
                break;
            default:
                throw TypeError(`Unknown type "${itemsType}"`);
        }
    }

    toBuffer() {
        return this._writer.toBuffer();
    }

    get offset() {
        return this._writer.size;
    }

    get size() {
        return this._writer.size;
    }

    getBufferAndOffset() {
        return [this.toBuffer(), this.offset];
    }
}