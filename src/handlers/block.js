/* eslint-env browser */
import * as Link from 'multiformats/link'
import { mhToString } from '../lib/multihash.js'
import { ErrorResponse } from '../lib/errors.js'
import { readMultiIndex } from '../lib/multi-index.js'

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings').Env} env
   * @param {unknown} ctx
   */
  async fetch (request, env, ctx) {
    const reqURL = new URL(request.url)
    const pathParts = reqURL.pathname.split('/')
    const blockCID = Link.parse(pathParts[2])
    /** @type {import('../bindings').MultihashString} */
    const blockMh = mhToString(blockCID.multihash)
    if (request.method === 'HEAD') {
      const found = await env.BLOCKLY.head(`${blockMh}/${blockMh}.idx`)
      return new Response(null, { status: found ? 200 : 404 })
    }

    const indexData = await request.blob()

    // Read the index to verify it's complete and formatted correctly
    const blockIndex = await readMultiIndex(indexData.stream())
    if (!blockIndex.has(blockCID)) {
      return new ErrorResponse(`missing index data for block: ${blockCID}`, 400)
    }
    // TODO: verify linked blocks?

    // @ts-expect-error
    await env.BLOCKLY.put(`${blockMh}/${blockMh}.idx`, indexData)
    return new Response()
  }
}
