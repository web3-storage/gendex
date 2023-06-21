/* eslint-env browser */
import * as Link from 'multiformats/link'
import * as json from '@ipld/dag-json'
import { getBlock } from '../lib/r2-block.js'
import { ErrorResponse } from '../lib/errors.js'
import { readMultiIndex } from '../lib/multi-index.js'
import { getAnyMapEntry } from '../lib/map.js'

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
    if (!request.body) return new ErrorResponse('missing index data', 400)

    const blockIndex = await readMultiIndex(request.body)
    const offsets = blockIndex.get(blockCID)
    if (!offsets) throw new Error(`missing block index data: ${blockCID}`)

    const [shard, offset] = getAnyMapEntry(offsets)
    const block = await getBlock(env.CARPARK, shard, offset)
    const blockLinks = [...block.links()].map(([, cid]) => cid)

    return new Response(
      json.encode(blockLinks),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
}
