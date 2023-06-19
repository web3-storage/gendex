/* eslint-env browser */
import * as Link from 'multiformats/link'
import * as json from '@ipld/dag-json'
import * as dagpb from '@ipld/dag-pb'
import { MultiIndexReader } from 'cardex/multi-index'
import { getBlock } from '../lib/r2-block.js'
import { mhToString } from '../lib/multihash.js'
import { ErrorResponse } from '../lib/errors.js'
import { getUnixFsMeta } from '../lib/unixfs.js'

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

    if (!request.body) return new ErrorResponse('missing index data', 400)
    const indexReader = MultiIndexReader.createReader({ reader: request.body.getReader() })

    /** @type {(import('cardex/multi-index/api').MultiIndexItem & import('cardex/mh-index-sorted/api').MultihashIndexItem)|null} */
    let indexItem = null
    while (true) {
      const { done, value } = await indexReader.read()
      if (done) break
      if (!('multihash' in value)) throw new Error('not MultihashIndexSorted')
      const item = /** @type {import('cardex/multi-index/api').MultiIndexItem & import('cardex/mh-index-sorted/api').MultihashIndexItem} */ (value)
      if (mhToString(item.multihash) === blockMh) {
        indexItem = item
      }
    }
    if (!indexItem) throw new Error(`missing block index data: ${blockMh}`)

    const block = await getBlock(env.CARPARK, indexItem.origin.toString(), indexItem.offset)
    const blockLinks = [...block.links()].map(([, cid]) => cid)

    const meta = block.cid.code === dagpb.code ? getUnixFsMeta(block.value.Data) : {}

    return new Response(
      json.encode({ cid: blockCID, links: blockLinks, meta }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
}
