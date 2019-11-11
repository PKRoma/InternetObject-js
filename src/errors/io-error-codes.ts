enum ErrorCodes {
  // General
  invalidType = 'invalid-type',
  tokenNotReady = 'token-not-ready',
  invalidValue = 'invalid-value',
  invalidArray = 'invalid-array',
  invalidObject = 'invalid-object',
  valueRequired = 'value-required',
  nullNotAllowed = 'null-not-allowed',

  // Parser Errors (Header)
  multipleHeaders = 'multiple-headers-found',
  invalidCollection = 'invalid-collection',
  invlidHeader = 'invalid-header',
  invalidHeaderItem = 'invalid-header-item',
  expectingSeparator = 'expecting-a-separator',
  openBracket = 'open-bracket',
  invalidBracket = 'invalid-bracket',
  incompleteEscapeSequence = 'incomplete-escape-sequence',

  // Parser Errors (Schema)
  invalidSchema = 'invalid-schema',

  // String
  notAString = 'not-a-string',
  invalidChar = 'invalid-char',
  invalidEmail = 'invalid-email',
  invalidUrl = 'invalid-url',

  // -- string, number, date, datetime, time
  valueNotInChoice = 'value-not-in-choice',
  invalidChoice = 'invalid-choice',

  // -- string, array
  invalidMinLength = 'invalid-min-length',
  invalidMaxLength = 'invalid-max-length',

  // Number
  notANumber = 'not-a-number',
  notAnInteger = 'not-an-integer',
  outOfRange = 'out-of-range',
  invalidMinValue = 'invalid-min-value',
  invalidMaxValue = 'invalid-max-value'
}

export default ErrorCodes
