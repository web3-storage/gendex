/* eslint-env mocha, browser */
import assert from 'node:assert'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import ndjson from 'ndjson'
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import * as Digest from 'multiformats/hashes/digest'
import { base58btc } from 'multiformats/bases/base58'
import { MultiIndexReader, MultiIndexWriter } from 'cardex/multi-index'
import { MultihashIndexSortedWriter } from 'cardex/multihash-index-sorted'
import * as json from '@ipld/dag-json'
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
 * @param {import('multiformats').UnknownLink} cid
 * @param {import('multiformats').UnknownLink[]} links
 */
export async function putBlockIndex (endpoint, http, blockIndex, cid, links) {
  const res = await http.dispatchFetch(new URL(`/block/${cid}`, endpoint).toString(), {
    method: 'PUT',
    // @ts-expect-error
    body: writeMultiIndex(blockIndex, [cid, ...links]),
    duplex: 'half'
  })
  assert.equal(res.status, 200)
  assert(res.body)

  /** @type {Array<{ cid: import('multiformats').UnknownLink, links: import('multiformats').UnknownLink[], meta: any }>} */
  const results = []
  await pipeline(
    // @ts-expect-error
    Readable.fromWeb(res.body),
    ndjson.parse(),
    async function (source) {
      for await (const item of source) {
        results.push(json.parse(JSON.stringify(item)))
      }
    }
  )
  assert(cid.equals(results.at(-1)?.cid))
  return results.slice(0, -1)
}

/**
 * Determine if a block index exists.
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('multiformats').UnknownLink} cid
 */
export async function hasBlockIndex (endpoint, http, cid) {
  const url = new URL(`/block/${cid}`, endpoint).toString()
  const res = await http.dispatchFetch(url, { method: 'HEAD' })
  if (res.status === 200) return true
  if (res.status === 404) return false
  throw new Error(`unexpected block index response status: ${res.status}`)
}

/**
 * Get a block index of the entire DAG.
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('multiformats').UnknownLink} root
 * @param {number} [max] Maximum allowed blocks to read (throws if exceeded).
 */
export async function getBlockIndex (endpoint, http, root, max) {
  const res = await http.dispatchFetch(new URL(`/index/${root}`, endpoint).toString())
  assert.equal(res.status, 200)
  assert(res.body)
  return readMultiIndex(res.body, max)
}

/**
 * Get links for a block (as base58 encoded multihash strings).
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('../src/bindings').BlockIndex} blockIndex
 * @param {import('multiformats').UnknownLink} cid
 * @returns {Promise<{ cid: import('multiformats').UnknownLink, links: import('multiformats').UnknownLink[], meta: any }>}
 */
export async function getBlockLinks (endpoint, http, blockIndex, cid) {
  const res = await http.dispatchFetch(new URL(`/links/${cid}`, endpoint).toString(), {
    method: 'POST',
    // @ts-expect-error
    body: writeMultiIndex(blockIndex, [cid]),
    duplex: 'half'
  })
  assert.equal(res.status, 200)
  return json.decode(new Uint8Array(await res.arrayBuffer()))
}

/**
 * @param {import('../src/bindings').BlockIndex} blockIndex
 * @param {import('multiformats').UnknownLink[]} blocks
 * @returns {import('cardex/reader/api').Readable<Uint8Array>}
 */
export function writeMultiIndex (blockIndex, blocks) {
  /** @type {import('../src/bindings').ShardIndex} */
  const shardIndex = new Map()
  for (const blockCID of blocks) {
    const blockMh = mhToString(blockCID.multihash)
    const offsets = blockIndex.get(blockMh)
    if (!offsets) throw new Error(`block not indexed: ${blockCID}`)
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
 * @param {number} [max] Maximum allowed blocks to read (throws if exceeded).
 */
export async function readMultiIndex (readable, max = Infinity) {
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
      if (blockIndex.size > max) {
        reader.cancel()
        throw new RangeError(`maximum index size exceeded (${max} blocks)`)
      }
    }
    shards.set(`${item.origin}`, item.offset)
  }
  return blockIndex
}
