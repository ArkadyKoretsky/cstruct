import { CStruct } from "./cstruct";
import { ReadLE } from "./read-le";
import { CStructClass, CStructReadResult, CStructWriteResult, Model, Types } from "./types";
import { WriteLE } from "./write-le";
import { MakeLE } from "./make-le";

/**
 * C_Struct LE - Little Endian
 * Binary/Object and vice versa parser for JavaScript
 *
 * Parse MODEL,
 * Parse TYPES,
 * Uses Object, JSON, C_Struct lang (kind of C)
 */
export class CStructLE<T> extends CStruct<T> {
    constructor(model: Model, types?: Types) {
        super(model, types);
    }

    read(buffer: Buffer, offset = 0): CStructReadResult<T> {
        const reader = new ReadLE<T>(this.modelClone, buffer, offset);
        return {
            struct: reader.toStruct() as T,
            offset: reader.offset,
            size: reader.size,
            toAtoms(): string[] {
                return reader.toAtoms();
            },
        };
    }

    write(buffer: Buffer, struct: T, offset = 0): CStructWriteResult {
        const writer = new WriteLE<T>(this.modelClone, struct, buffer, offset);
        return {
            buffer: writer.toBuffer(),
            offset: writer.offset,
            size: writer.size,
            toAtoms(): string[] {
                return writer.toAtoms();
            },
        }
    }

    make(struct: T): CStructWriteResult {
        const writer = new MakeLE<T>(this.modelClone, struct);
        return {
            buffer: writer.toBuffer(),
            offset: writer.offset,
            size: writer.size,
            toAtoms(): string[] {
                return writer.toAtoms();
            },
        }
    }

    static make<CStructLEClass>(struct: CStructLEClass): CStructWriteResult {
        return (struct as CStructClass<CStructLEClass>).make();
    }

    static write<CStructLEClass>(struct: CStructLEClass, buffer: Buffer, offset?: number) {
        return (struct as CStructClass<CStructLEClass>).write(buffer, offset);
    }

    static read<CStructLEClass>(struct: CStructLEClass, buffer: Buffer, offset?: number): CStructReadResult<CStructLEClass> {
        return (struct as CStructClass<CStructLEClass>).read(buffer, offset);
    }
}