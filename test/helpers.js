/* eslint-env mocha, browser */
import assert from 'node:assert'
import { pipeline } from 'node:stream/promises'
import ndjson from 'ndjson'
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import * as Digest from 'multiformats/hashes/digest'
import { base58btc } from 'multiformats/bases/base58'
import { MultiIndexReader, MultiIndexWriter } from 'cardex/multi-index'
import { MultihashIndexSortedWriter } from 'cardex/multihash-index-sorted'
import { mhToString } from '../src/lib/multihash.js'
import { getAnyMapEntry } from '../src/lib/map.js'

/**
 * @typedef {{ dispatchFetch (input: RequestInfo, init?: RequestInit): Promise<Response> }} Dispatcher
 */

/**
 * Write an index for the provided shard in SATNAV and add DUDEWHERE link.
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('multiformats').UnknownLink} root
 * @param {import('cardex/api').CARLink} shard
 */
export async function putShardIndex (endpoint, http, root, shard) {
  const res = await http.dispatchFetch(new URL(`/shard/${root}/${shard}`, endpoint).toString(), { method: 'POST' })
  assert.equal(res.status, 200)
  return res
}

/**
 * Write an index for the provided shard in SATNAV and add DUDEWHERE link.
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('../src/bindings').BlockIndex} blockIndex
 * @param {import('../src/bindings').MultihashString} multihash
 * @param {import('../src/bindings').MultihashString[]} links
 */
export async function putBlockIndex (endpoint, http, blockIndex, multihash, links) {
  const res = await http.dispatchFetch(new URL(`/block/${multihash}`, endpoint).toString(), {
    method: 'POST',
    // @ts-expect-error
    body: writeMultiIndex(blockIndex, [multihash, ...links])
  })
  assert.equal(res.status, 200)
  assert(res.body)

  /** @type {Array<{ multihash: import('../src/bindings').MultihashString, links: import('../src/bindings').MultihashString[] }>} */
  const results = []
  await pipeline(
    // @ts-expect-error
    res.body,
    ndjson.parse(),
    async function (source) {
      for await (const item of source) {
        results.push(item)
      }
    }
  )
  assert(results.at(-1)?.multihash === multihash)
  return results.slice(0, -1)
}

/**
 * Get a block index of the entire DAG.
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('multiformats').UnknownLink} root
 */
export async function getBlockIndex (endpoint, http, root) {
  const res = await http.dispatchFetch(new URL(`/index/${root}`, endpoint).toString())
  assert.equal(res.status, 200)
  assert(res.body)
  return readMultiIndex(res.body)
}

/**
 * Get links for a block (as base58 encoded multihash strings).
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('../src/bindings').BlockIndex} blockIndex
 * @param {import('../src/bindings').MultihashString} multihash
 * @returns {Promise<import('../src/bindings').MultihashString[]>}
 */
export async function getBlockLinks (endpoint, http, blockIndex, multihash) {
  const res = await http.dispatchFetch(new URL(`/links/${multihash}`, endpoint).toString(), {
    method: 'POST',
    // @ts-expect-error
    body: writeMultiIndex(blockIndex, [multihash])
  })
  assert.equal(res.status, 200)
  assert(res.body)
  return res.json()
}

/**
 * @param {import('../src/bindings').BlockIndex} blockIndex
 * @param {string[]} blocks
 * @returns {import('cardex/reader/api').Readable<Uint8Array>}
 */
export function writeMultiIndex (blockIndex, blocks) {
  /** @type {import('../src/bindings').ShardIndex} */
  const shardIndex = new Map()
  for (const blockMh of blocks) {
    const offsets = blockIndex.get(blockMh)
    if (!offsets) throw new Error(`block not indexed: ${blockMh}`)
    const [shard, offset] = getAnyMapEntry(offsets)
    let blocks = shardIndex.get(shard)
    if (!blocks) {
      blocks = new Map()
      shardIndex.set(shard, blocks)
    }
    blocks.set(blockMh, offset)
  }

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

  writer.close()
  return readable
}

/**
 * @param {import('cardex/reader/api').Readable} readable
 */
export async function readMultiIndex (readable) {
  /** @type {import('../src/bindings').BlockIndex} */
  const blockIndex = new Map()
  const reader = MultiIndexReader.createReader({ reader: readable.getReader() })
  while (true) {
    const { done, value } = await reader.read()
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
  return blockIndex
}
