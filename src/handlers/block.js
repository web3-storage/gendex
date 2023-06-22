/* eslint-env browser */
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'
import { mhToString } from '../lib/multihash.js'
import { readMultiIndex } from '../lib/multi-index.js'

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings').Env} env
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
   */
  async fetch (request, env, ctx) {
    const reqURL = new URL(request.url)
    const pathParts = reqURL.pathname.split('/')
    const blockCID = Link.parse(pathParts[2])
    const blockMhStr = mhToString(blockCID.multihash)
    const indexBytes = new Uint8Array(await request.arrayBuffer())
    const indexMh = await sha256.digest(indexBytes)
    const indexMhStr = mhToString(indexMh)

    if (!(await env.BLOCKLY.head(`${blockMhStr}/${indexMhStr}.idx`))) {
      await env.BLOCKLY.put(`${blockMhStr}/${indexMhStr}.idx`, indexBytes)
    }

    ctx.waitUntil((async () => {
      if (!(await env.BLOCKLY.head(`${blockMhStr}/.idx`))) {
        // Read the index to verify it's complete and formatted correctly
        const blockIndex = await readMultiIndex(new Blob([indexBytes]).stream())
        if (!blockIndex.has(blockCID)) {
          throw new Error(`missing index data for block: ${blockCID}`)
        }
        // TODO: verify linked blocks?
        await env.BLOCKLY.put(`${blockMhStr}/.idx`, indexBytes)
      }
    })())

    return new Response()
  }
}
