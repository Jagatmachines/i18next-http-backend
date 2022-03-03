
// eslint-disable-next-line no-unused-vars
import * as fsMod from './fs.cjs'

const isDeno = typeof Deno !== 'undefined'

const fs = fsMod ? (fsMod.default || fsMod) : undefined // because of strange export

const removeFileInNode = (filename) => {
  return new Promise((resolve, reject) => fs.unlink(filename, (err) => err ? reject(err) : resolve()))
}

const removeFileInDeno = (filename) => {
  // eslint-disable-next-line no-undef
  return Deno.remove(filename)
}

export function removeFile (filename) {
  const fn = isDeno ? removeFileInDeno : removeFileInNode
  return fn(filename)
}
