import Token from '../token';
import { throwError } from '../errors';
import {
  isDataType, isArray,
  isParserTree, isKeyVal } from '../is'
import { ASTParserTree, ParserTreeValue } from '.';
import SchemaParser from './schema-parser';


export default class ASTParser {
  public stack:ASTParserTree[] = []
  private lastObj:any = null
  private lastToken:Token|null = null


  process = (token:Token, isFinalToken:boolean = false) => {
    let stack = this.stack

    let obj = this.getObject()

    if (token.value === "{") {
      // this.stack.push("{")
      this.push()
      // return
    }
    else if(token.value === "[") {
      // this.stack.push("[")
      this.push("array")
      // return
    }
    else if(token.type !== "sep") {
      this.addValue(token.value)
    }
    else if (token.value === ':') {
      let lastVal = obj.values[obj.values.length - 1]

      if (lastVal && ['string', 'number', 'boolean'].indexOf(typeof lastVal) > -1) {
        obj.values[obj.values.length - 1] = {
          key: lastVal.toString(),
          value: undefined
        }
        // console.log(obj.values)
      }
      else {
        // TODO:Handle null and other types
        // Throw Invalid key error!
      }
    }
    // Empty token
    else if (token.value === ",") {
      if(this.lastToken !== null && this.lastToken.value === ",") {
        this.addValue("")
      }
    }
    else if (token.value === "}" || token.value === "]") {
      this.pop(token.value === "}"
        ? "object"
        : "array", token)
    }

    this.lastToken = token
  }

  public toObject = () => {
    if (this.stack.length === 0) return null

    const tree = this.stack[0]

    if (tree.values.length === 0) {
      return
    }
    else if (tree.values.length === 1) {
      return tree.values[0]
    }

    const generateObject = (root:ASTParserTree, container:any) => {
      for (let index=0; index < root.values.length; index += 1) {
        let value = root.values[index]

        if (isParserTree(value)) {
          // Object
          if(value.type === 'object') {
            container[index] = generateObject(value, {})
          }
          // Array
          else if(value.type === 'array') {
            container[index] = generateObject(value, [])
          }
        }
        else if(isKeyVal(value)) {
          if (isParserTree(value.value)) {
            container[value.key] = generateObject(value.value,
              value.value.type === "object" ? {} : [])
          }
          else {
            container[value.key] = value.value
          }
        }
        else {
          container[index] = value
        }
      }
      return container
    }

    return generateObject(tree, {})
  }

  public toSchema = () => {
    if (this.stack.length === 0) return null
    const tree = this.stack[0]
    return SchemaParser.parse(tree)
  }

  private addValue = (value: ParserTreeValue) => {
    let obj = this.getObject()

    // If last token is : then
    if (this.lastToken !== null && this.lastToken.value === ":") {
      let lastVal = obj.values[obj.values.length - 1]
      // console.log("---", lastVal)
      if (lastVal && isKeyVal(lastVal)) {
        // obj.values[obj.values.length - 1].value = value
        lastVal.value = value
      }
      else {
        // TODO: Verify this case!
      }
    }
    else {
      obj.values.push(value)
    }
  }

  private getObject = () => {
    if (this.stack.length === 0) {
      this.stack.push({
        type: "object",
        values: []
      })
    }

    let obj = this.stack[this.stack.length-1]
    return obj
  }

  private push = (type="object", values=[]) => {
    let object = this.getObject()
    let newObject = { type, values }
    this.addValue(newObject)
    this.stack.push(newObject)
  }

  private pop = (type:string, token:Token) => {
    const obj = this.getObject()

    if (obj.type !== type) {
      const message = `Expecting "${
          obj.type === "object" ? "}" : "]"
        }" but found "${
          obj.type === "object" ? "]" : "}"
        }"`
      throwError(token, message)
    }
    this.stack.pop()
  }

}

