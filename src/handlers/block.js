/* eslint-env browser */
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import * as Digest from 'multiformats/hashes/digest'
import { base58btc } from 'multiformats/bases/base58'
import { toString, fromString } from 'multiformats/bytes'
import { MultihashIndexSortedWriter } from 'cardex'
import { MultiIndexWriter, MultiIndexReader } from 'cardex/multi-index'
import { transform } from 'streaming-iterables'
import * as json from '@ipld/dag-json'
import * as dagpb from '@ipld/dag-pb'
import { UnixFS } from 'ipfs-unixfs'
import { getBlock } from '../lib/r2-block.js'
import { mhToString } from '../lib/multihash.js'
import { iteratorToStream, streamToBlob } from '../lib/stream.js'
import { getAnyMapEntry } from '../lib/map.js'
import { ErrorResponse } from '../lib/errors.js'

const CONCURRENCY = 20

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

    /** @type {import('../bindings').BlockIndex} */
    const blockIndex = new Map()
    while (true) {
      const { done, value } = await indexReader.read()
      if (done) break
      if (!('multihash' in value)) throw new Error('not MultihashIndexSorted')
      const item = /** @type {import('cardex/multi-index/api').MultiIndexItem & import('cardex/mh-index-sorted/api').MultihashIndexItem} */ (value)
      const blockMh = mhToString(item.multihash)
      let shards = blockIndex.get(blockMh)
      if (!shards) {
        shards = new Map()
        blockIndex.set(blockMh, shards)
      }
      shards.set(`${item.origin}`, item.offset)
    }

    const offsets = blockIndex.get(blockMh)
    if (!offsets) throw new Error(`missing block index data: ${blockMh}`)

    const [parentShard, offset] = getAnyMapEntry(offsets)
    const block = await getBlock(env.CARPARK, parentShard, offset)
    const blockLinks = [...block.links()].map(([, cid]) => cid)

    return new Response(iteratorToStream((async function * () {
      try {
        // return the block's links links back to caller
        const linkLinks = transform(CONCURRENCY, async link => {
          const linkMh = mhToString(link.multihash)
          const offsets = blockIndex.get(linkMh)
          if (!offsets) throw new Error(`block not indexed: ${link}`)
          const [shard, offset] = getAnyMapEntry(offsets)
          const linkBlock = await getBlock(env.CARPARK, shard, offset)
          const meta = linkBlock.cid.code === dagpb.code
            ? { type: UnixFS.unmarshal(linkBlock.value.Data).type }
            : {}
          return { cid: link, links: [...linkBlock.links()].map(([, cid]) => cid), meta }
        }, blockLinks)

        for await (const block of linkLinks) {
          yield ndjsonEncode(block)
        }

        /** @type {import('../bindings').ShardIndex} */
        const shardIndex = new Map([[parentShard, new Map([[blockMh, offset]])]])

        for (const link of blockLinks) {
          const linkMh = mhToString(link.multihash)
          const offsets = blockIndex.get(linkMh)
          if (!offsets) throw new Error(`block not indexed: ${link}`)
          const [shard, offset] = offsets.has(parentShard) ? [parentShard, offsets.get(parentShard) ?? 0] : getAnyMapEntry(offsets)
          let blocks = shardIndex.get(shard)
          if (!blocks) {
            blocks = new Map()
            shardIndex.set(shard, blocks)
          }
          blocks.set(linkMh, offset)
        }

        // write index for current block
        const { readable, writable } = new TransformStream()
        const writer = MultiIndexWriter.createWriter({ writer: writable.getWriter() })

        for (const [shard, blocks] of shardIndex.entries()) {
          writer.add(Link.parse(shard), async ({ writer }) => {
            const index = MultihashIndexSortedWriter.createWriter({ writer })
            for (const [blockMh, offset] of blocks.entries()) {
              const cid = Link.create(raw.code, Digest.decode(base58btc.decode(blockMh)))
              index.add(cid, offset)
            }
            await index.close()
          })
        }

        await Promise.all([
          writer.close(),
          (async () => {
            const data = await streamToBlob(readable)
            // @ts-expect-error
            await env.BLOCKLY.put(`${blockMh}/${blockMh}.idx`, data.stream())
          })()
        ])

        const meta = block.cid.code === dagpb.code
          ? { type: UnixFS.unmarshal(block.value.Data).type }
          : {}

        // finally, write the block multihash and it's links to the stream
        // this signifies that we completed successfully.
        yield ndjsonEncode({ cid: blockCID, links: blockLinks, meta })
      } catch (err) {
        console.error(err)
        yield ndjsonEncode({ error: err.message })
        throw err
      }
    })()), { headers: { 'Content-Type': 'application/x-ndjson' } })
  }
}

/** @param {any} data */
function ndjsonEncode (data) {
  return fromString(`${toString(json.encode(data))}\n`)
}
