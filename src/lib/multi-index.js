/* eslint-env browser */
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import { MultihashIndexSortedWriter } from 'cardex/multihash-index-sorted'
import { MultiIndexWriter, MultiIndexReader } from 'cardex/multi-index'
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

/**
 * @param {import('../bindings').BlockIndexData} indexData
 * @returns {ReadableStream<Uint8Array>}
 */
export function writeMultiIndex (indexData) {
  /** @type {import('../bindings').ShardIndex} */
  const shardIndex = new LinkMap([[indexData.shard, new LinkMap([[indexData.block, indexData.offset]])]])
  for (const link of indexData.links) {
    let blocks = shardIndex.get(link.shard)
    if (!blocks) {
      blocks = new LinkMap()
      shardIndex.set(link.shard, blocks)
    }
    blocks.set(link.block, link.offset)
  }

  const { readable, writable } = new TransformStream()
  const writer = MultiIndexWriter.createWriter({ writer: writable.getWriter() })

  for (const [shard, blocks] of shardIndex.entries()) {
    // @ts-expect-error we have to make a copy here because miniflare
    writer.add(Link.parse(shard.toString()), async ({ writer }) => {
      const index = MultihashIndexSortedWriter.createWriter({ writer })
      for (const [block, offset] of blocks.entries()) {
        // we have to make a copy here because miniflare
        index.add(Link.parse(block.toString()), offset)
      }
      await index.close()
    })
  }

  writer.close()
  return readable
}
