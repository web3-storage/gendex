/* eslint-env browser */
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import { MultiIndexReader } from 'cardex/multi-index'
import { Map as LinkMap } from 'lnmap'

/**
 * @param {import('cardex/reader/api').Readable} readable
 */
export async function readMultiIndex (readable) {
  /** @type {import('../bindings').BlockIndex} */
  const blockIndex = new LinkMap()
  const reader = MultiIndexReader.createReader({ reader: readable.getReader() })
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!('multihash' in value)) throw new Error('not MultihashIndexSorted')
    const item = /** @type {import('cardex/multi-index/api').MultiIndexItem & import('cardex/mh-index-sorted/api').MultihashIndexItem} */ (value)
    const blockCID = Link.create(raw.code, item.multihash)
    let shards = blockIndex.get(blockCID)
    if (!shards) {
      shards = new LinkMap()
      blockIndex.set(blockCID, shards)
    }
    shards.set(item.origin, item.offset)
  }
  return blockIndex
}
