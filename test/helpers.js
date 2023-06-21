/* eslint-env mocha, browser */
import assert from 'node:assert'
import { MultiIndexWriter } from 'cardex/multi-index'
import { MultihashIndexSortedWriter } from 'cardex/multihash-index-sorted'
import * as json from '@ipld/dag-json'
import { Map as LinkMap } from 'lnmap'
import * as Link from 'multiformats/link'
import { getAnyMapEntry } from '../src/lib/map.js'
import { readMultiIndex } from '../src/lib/multi-index.js'

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
 * Write an index for the provided block.
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
    body: writeMultiIndex(blockIndex, [cid, ...links])
  })
  assert.equal(res.status, 200)
}

/**
 * Get block indexs of the passed shards.
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('cardex/api').CARLink[]} shards
 */
export async function getIndex (endpoint, http, shards) {
  const res = await http.dispatchFetch(new URL('/index', endpoint).toString(), {
    method: 'POST',
    body: json.encode(shards)
  })
  assert.equal(res.status, 200)
  assert(res.body)
  return readMultiIndex(res.body)
}

/**
 * Get links for a block (as base58 encoded multihash strings).
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('../src/bindings').BlockIndex} blockIndex
 * @param {import('multiformats').UnknownLink} cid
 * @returns {Promise<import('multiformats').UnknownLink[]>}
 */
export async function getBlockLinks (endpoint, http, blockIndex, cid) {
  const res = await http.dispatchFetch(new URL(`/links/${cid}`, endpoint).toString(), {
    method: 'POST',
    // @ts-expect-error
    body: writeMultiIndex(blockIndex, [cid])
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
  const shardIndex = new LinkMap()
  for (const blockCID of blocks) {
    const offsets = blockIndex.get(blockCID)
    if (!offsets) throw new Error(`block not indexed: ${blockCID}`)
    const [shard, offset] = getAnyMapEntry(offsets)
    let blocks = shardIndex.get(shard)
    if (!blocks) {
      blocks = new LinkMap()
      shardIndex.set(shard, blocks)
    }
    blocks.set(blockCID, offset)
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
