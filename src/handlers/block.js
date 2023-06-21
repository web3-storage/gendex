/* eslint-env browser */
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'
import { mhToString } from '../lib/multihash.js'
import { ErrorResponse } from '../lib/errors.js'
import { readMultiIndex } from '../lib/multi-index.js'

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings').Env} env
   */
  async fetch (request, env) {
    const reqURL = new URL(request.url)
    const pathParts = reqURL.pathname.split('/')
    const blockCID = Link.parse(pathParts[2])
    const indexBytes = new Uint8Array(await request.arrayBuffer())

    // Read the index to verify it's complete and formatted correctly
    const blockIndex = await readMultiIndex(new Blob([indexBytes]).stream())
    if (!blockIndex.has(blockCID)) {
      return new ErrorResponse(`missing index data for block: ${blockCID}`, 400)
    }
    // TODO: verify linked blocks?

    const blockMhStr = mhToString(blockCID.multihash)
    const indexMh = await sha256.digest(indexBytes)
    const indexMhStr = mhToString(indexMh)
    await Promise.all([
      (async () => {
        if (!(await env.BLOCKLY.head(`${blockMhStr}/${indexMhStr}.idx`))) {
          await env.BLOCKLY.put(`${blockMhStr}/${indexMhStr}.idx`, indexBytes)
        }
      })(),
      (async () => {
        if (!(await env.BLOCKLY.head(`${blockMhStr}/.idx`))) {
          await env.BLOCKLY.put(`${blockMhStr}/.idx`, indexMh.bytes)
        }
      })()
    ])

    return new Response()
  }
}
