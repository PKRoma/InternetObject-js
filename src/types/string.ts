import { InternetObjectError, ErrorArgs, InternetObjectValidationError } from '../errors/io-error'
import { ParserTreeValue, Node } from '../parser/index'
import { isNumber, isString, isToken } from '../utils/is'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'
import ErrorCodes from '../errors/io-error-codes'
import { Token } from '../parser'
import KeyValueCollection from '../header'

// Reference: RFC 5322 Official Standard
// http://emailregex.com
const emailExp = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/

// http://urlregex.com
const urlExp = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/

/**
 * Represents the StringTypeDef which is reponsible for parsing,
 * validating, loading and serializing strings.
 *
 * It performs the following validation
 * - Value is string
 * - Value is optional
 * - Value is nullable
 * - Value length <= maxLength
 * - Value length >= minLength
 * - Value is in choices
 */
export default class StringDef implements TypeDef {
  private _type: string

  constructor(type: string = 'string') {
    this._type = type
  }

  /**
   * Returns the type this instance is going to handle.
   * The return value could be any of the "string", "email", or "url"
   */
  getType() {
    return this._type
  }

  /**
   * Parses the string in IO format into JavaScript strings.
   */
  parse(data: ParserTreeValue, memberDef: MemberDef, vars?: KeyValueCollection): string {
    return this.validate(data, memberDef, vars)
  }

  /**
   * Loads the JavaScript string.
   */
  load(data: any, memberDef: MemberDef): string {
    return this.validate(data, memberDef)
  }

  /**
   * Serializes the string into IO format.
   */
  serialize(data: string, memberDef: MemberDef): string {
    let value = this.validate(data, memberDef)

    const regexSep = /[~,:\{\}\[\]\@]|(?:---)/g

    // When a separator is found in the data,
    // enclose the result string in a quoration
    if (regexSep.exec(value) !== null) {
      value = '"' + value + '"'
    }

    return value
  }

  validate(data: any, memberDef: MemberDef, vars?: KeyValueCollection): string {
    const node = isToken(data) ? data : undefined
    const value = node ? node.value : data

    return _process(memberDef, value, node, vars)
  }
}

function _process(
  memberDef: MemberDef,
  value: string,
  node?: Token,
  vars?: KeyValueCollection
): string {
  // Replace vars
  if (vars) {
    const valueFound = vars.getV(value)
    value = valueFound || value
  }

  // Run common check
  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== value || validatedData === null || validatedData === undefined) {
    return validatedData
  }

  // Validate
  if (!isString(value)) {
    throw new InternetObjectError(ErrorCodes.notAString)
  }

  // TODO: Validate Data for subtypes
  _validatePattern(memberDef, value, node)

  const maxLength = memberDef.maxLength

  // Max length check
  if (maxLength !== undefined && isNumber(maxLength)) {
    if (value.length > maxLength) {
      throw new InternetObjectValidationError(
        ErrorCodes.invalidMaxLength,
        `Invalid maxLength for ${memberDef.path}.`
      )
    }
  }

  const minLength = memberDef.minLength
  // Max length check
  if (minLength !== undefined && isNumber(minLength)) {
    if (value.length > minLength) {
      throw new InternetObjectError(
        ErrorCodes.invalidMinLength,
        `Invalid minLength for ${memberDef.path}.`
      )
    }
  }
  return value
}

function _validatePattern(memberDef: MemberDef, value: string, node?: Node) {
  const type = memberDef.type

  // Validate user defined pattern
  if (type === 'string' && memberDef.pattern !== undefined) {
    let re = memberDef.re
    if (!re) {
      let pattern = memberDef.pattern
      // Add ^ and $ at the begging and end of the pattern respectively
      // if these characters are not set in the pattern
      pattern = pattern.startsWith('^') ? pattern : `^${pattern}`
      pattern = pattern.endsWith('$') ? pattern : `${pattern}$`

      // Compile the expression and cache it into the memberDef
      re = memberDef.re = new RegExp(pattern)
    }
    if (!re.test(value)) {
      throw new InternetObjectError(ErrorCodes.invalidValue)
    }
  }
  // Validate email
  else if (type === 'email') {
    if (!emailExp.test(value)) {
      throw new InternetObjectError(ErrorCodes.invalidEmail)
    }
  }
  // Validate url
  else if (type === 'url') {
    if (!urlExp.test(value)) {
      throw new InternetObjectError(ErrorCodes.invalidUrl)
    }
  }
}

function _notAString(path: string, data: Token): ErrorArgs {
  return [ErrorCodes.notAString, `Expecting a string value for "${path}"`, data]
}

function _invlalidChoice(path: string, data: Token, choices: number[]): ErrorArgs {
  return [
    ErrorCodes.invalidValue,
    `The value of "${path}" must be one of the [${choices.join(',')}]. Currently it is ${
      data.value
    }.`,
    data
  ]
}

function _invlalidMinLength(path: string, data: Token, minLength: number): ErrorArgs {
  return [
    ErrorCodes.invalidMinLength,
    `The length of "${path}" must be ${minLength} or more. Currently it is ${data.value.length}.`,
    data
  ]
}

function _invlalidMaxLength(path: string, data: Token, maxLength: number): ErrorArgs {
  return [
    ErrorCodes.invalidMaxLength,
    `The length of "${path}" must be ${maxLength} or more. Currently it is ${data.value.length}.`,
    data
  ]
}
