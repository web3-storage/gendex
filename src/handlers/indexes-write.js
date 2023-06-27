/* eslint-env browser */
import { sha256 } from 'multiformats/hashes/sha2'
import * as json from '@ipld/dag-json'
import { mhToString } from '../lib/multihash.js'
import { writeMultiIndex } from '../lib/multi-index.js'
import { streamToBytes } from '../lib/stream.js'

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings').Env} env
   * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
   */
  async fetch (request, env, ctx) {
    /** @type {import('./indexes-generate').BlocklyIndexData[]} */
    const indexDatas = json.decode(new Uint8Array(await request.arrayBuffer()))

    await Promise.all(indexDatas.map(async indexData => {
      const indexBytes = await streamToBytes(writeMultiIndex(indexData))
      const indexMh = await sha256.digest(indexBytes)
      const indexMhStr = mhToString(indexMh)
      const blockMhStr = mhToString(indexData.block.multihash)
      await Promise.all([
        env.BLOCKLY.put(`${blockMhStr}/${indexMhStr}.idx`, indexBytes.buffer),
        env.BLOCKLY.put(`${blockMhStr}/.idx`, indexBytes.buffer)
      ])
    }))

    return new Response()
  }
}
