/* eslint-env browser */
import { MultiIndexReader } from 'cardex/multi-index'
import { getBlock } from '../lib/r2-block.js'
import { mhToString } from '../lib/multihash.js'
import { ErrorResponse } from '../lib/errors.js'

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings').Env} env
   * @param {unknown} ctx
   */
  async fetch (request, env, ctx) {
    const reqURL = new URL(request.url)
    const pathParts = reqURL.pathname.split('/')
    /** @type {import('../bindings').MultihashString} */
    const blockMh = pathParts[2]

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

    return new Response(
      JSON.stringify(blockLinks.map(cid => mhToString(cid.multihash))),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
}
