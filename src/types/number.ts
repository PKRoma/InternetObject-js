import Definitions          from '../core/definitions'
import InternetObjectError  from '../errors/io-error'
import ErrorCodes           from '../errors/io-error-codes'
import ValidationError      from '../errors/io-validation-error'
import Node                 from '../parser/nodes/nodes'
import Schema               from '../schema/schema'
import TypeDef              from '../schema/typedef'
import doCommonTypeCheck    from './common-type'
import MemberDef            from './memberdef'

const NUMBER_TYPES = [
  'bigint',
  'int', 'uint', 'float', 'number',       // General number types
  'int8', 'int16', 'int32',               // Size specific number types
  'uint8', 'uint16', 'uint32', 'uint64',  // Unsigned number types
  'float32', 'float64'                    // Floating point number types
]

const NUMBER_MAP = NUMBER_TYPES.reduce((acc, type) => {
  acc[type] = true
  return acc
}, {} as { [key: string]: boolean })

const numberSchema = new Schema(
  "number",
  { type:     { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:  { type: "number", optional: true,  null: false  } },
  { choices:  { type: "array",  optional: true,  null: false, of: { type: "number" } } },
  { min:      { type: "number", optional: true,  null: false, min: 0 } },
  { max:      { type: "number", optional: true,  null: false, min: 0 } },
  { optional: { type: "bool",   optional: true,  null: false, default: false } },
  { null:     { type: "bool",   optional: true,  null: false, default: false } },
)

const bigintSchema = new Schema(
  "number",
  { type:     { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:  { type: "bigint", optional: true,  null: false  } },
  { choices:  { type: "array",  optional: true,  null: false, of: { type: "bigint" } } },
  { min:      { type: "bigint", optional: true,  null: false, min: 0 } },
  { max:      { type: "bigint", optional: true,  null: false, min: 0 } },
  { optional: { type: "bool",   optional: true,  null: false, default: false } },
  { null:     { type: "bool",   optional: true,  null: false, default: false } },
)

/**
 * Represents the various number related data types in Internet Object.
 *
 * @internal
 */
class NumberDef implements TypeDef {
  private _type: string;
  private _validator: any;

  get type(): string { return this._type; }
  get schema(): Schema {
    if (this._type === 'bigint') {
      return bigintSchema;
    }
    return numberSchema;
  }

  constructor(type: string = 'number') {
    this._type = type;
    this._validator = _getValidator(type);
  }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): number {
    const valueNode = defs?.getV(node) || node;
    const { value } = doCommonTypeCheck(memberDef, valueNode, node, defs);
    this._validator(memberDef, value, node);

    if (memberDef.min !== null && value < memberDef.min) {
      throwError(ErrorCodes.outOfRange, memberDef.path!, value, node);
    }

    if (memberDef.max !== null && value > memberDef.max) {
      throwError(ErrorCodes.outOfRange, memberDef.path!, value, node);
    }

    return value;
  }

  static get types() {
    return NUMBER_TYPES;
  }
}

// Helper function for throwing validation errors
function throwError(code: string, memberPath: string, value: any, node?: Node) {
  throw new ValidationError(
    code,
    `The '${memberPath}' must be within the specified range, Currently it is ${value}.`,
    node
  );
}

function _intValidator(min: number | null, max: number | null, memberDef: MemberDef, value: any, node?: Node) {
  const valueType = typeof value === "bigint" ? "bigint" : NUMBER_MAP[typeof value] ? "number" : "";
  const memberdefType = memberDef.type === "bigint" ? "bigint" : "number";

  if (valueType === "") {
    throw new ValidationError(
      ErrorCodes.invalidType,
      `Expecting a value of type '${memberDef.type}' for '${memberDef.path}'`,
      node
    );
  }

  if (memberdefType !== valueType) {
    throw new ValidationError(
      `not-a-${memberDef.type}`,
      `Invalid value encountered for '${memberDef.path}'`,
      node
    )
  }

  if ((min !== null && value < min) || (max !== null && value > max)) {
    throwError(ErrorCodes.invalidRange, memberDef.path!, value, node);
  }
}

function _getValidator(type: string) {
  switch (type) {
    case 'float':
    case 'float64':
    case 'number':
    case 'bigint':
    case 'int':
      return _intValidator.bind(null, null, null);

    case 'uint':
      return _intValidator.bind(null, 0, null);

    case 'int8':
      return _intValidator.bind(null, -(2 ** 7), 2 ** 7 - 1);

    case 'uint8':
      return _intValidator.bind(null, 0, 2 ** 8 - 1);

    case 'int16':
      return _intValidator.bind(null, -(2 ** 15), 2 ** 15 - 1);

    case 'uint16':
      return _intValidator.bind(null, 0, 2 ** 16 - 1);

    case 'int32':
      return _intValidator.bind(null, -(2 ** 31), 2 ** 31 - 1);

    case 'uint32':
      return _intValidator.bind(null, 0, 2 ** 32 - 1);

    case 'uint64':
    case 'int64':
    case 'float32':
    case 'float64':
      return (memberDef: MemberDef, value: any, node?: Node) => {
        throw new InternetObjectError(ErrorCodes.unsupportedNumberType, `The number type '${type}' is not supported.`);
      }



    default:
      throw new InternetObjectError(ErrorCodes.invalidType, `The number type '${type}' is not a valid number type.`);
  }
}




export default NumberDef
