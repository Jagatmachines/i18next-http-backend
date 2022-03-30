import JSON5 from './formats/json5.js'
// eslint-disable-next-line no-unused-vars
import jsYaml from './formats/yaml.js'
import * as fsMod from './fs.cjs'
import * as pathMod from './path.cjs'
import extname from './extname.js'
const isDeno = typeof Deno !== 'undefined'
const YAML = typeof jsYaml !== 'undefined' && jsYaml.load ? jsYaml : undefined
const fs = fsMod ? (fsMod.default || fsMod) : undefined // because of strange export
const path = pathMod ? (pathMod.default || pathMod) : undefined

const readFileInNode = (filename) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, 'utf8', (err, data) => {
      if (err) return reject(err)
      fs.stat(filename, (err, stat) => {
        if (err) return resolve({ data })
        return resolve({ data, stat })
      })
    })
  })
}

const readFileInDeno = (filename) => {
  return new Promise((resolve, reject) => {
    const decoder = new TextDecoder('utf-8')
    // eslint-disable-next-line no-undef
    Deno.readFile(filename).then((d) => {
      const data = decoder.decode(d)
      // eslint-disable-next-line no-undef
      Deno.stat(filename).then((stat) => resolve({ data, stat })).catch(() => resolve({ data }))
    }).catch(reject)
  })
}

const parseData = (extension, data, options) => {
  data = data.replace(/^\uFEFF/, '')
  let result = {}
  switch (extension) {
    case '.js':
    case '.ts':
      if (typeof module === 'undefined') {
        if (data.indexOf('exports') > -1) { // just to try...
          data = `(${data.substring(data.indexOf('=') + 1).replace(/;/, '')})`
        } else if (data.indexOf('export default ') > -1) { // just to try...
          data = `(${data.substring(data.indexOf('export default ') + 15).replace(/;/, '')})`
        }
      }
      // eslint-disable-next-line no-eval
      result = eval(data)
      break
    case '.json5':
      result = JSON5.parse(data)
      break
    case '.yml':
    case '.yaml':
      result = YAML.load(data)
      break
    default:
      result = options.parse(data)
  }
  return result
}

const resolvePath = (filename) => {
  return !path.isAbsolute(filename) && typeof process !== 'undefined' && process.cwd && !fs.existsSync(filename) ? path.join(process.cwd(), filename) : filename
}

export function readFile (filename, options = { parse: JSON.parse }) {
  const ext = extname(filename)
  if (['.js', '.ts'].indexOf(ext) > -1 && typeof require !== 'undefined') {
    return new Promise((resolve, reject) => {
      try {
        resolve({ data: require(resolvePath(filename)) })
      } catch (err) {
        reject(err)
      }
    })
  }
  const fn = isDeno ? readFileInDeno : readFileInNode
  return new Promise((resolve, reject) => {
    fn(filename).then(({ data, stat }) => {
      try {
        const ret = parseData(ext, data, options)
        resolve({ data: ret, stat })
      } catch (err) {
        err.message = 'error parsing ' + filename + ': ' + err.message
        reject(err)
      }
    }).catch(reject)
  })
}