/* eslint-env mocha, browser */
import assert from 'node:assert'
import { MultiIndexWriter } from 'cardex/multi-index'
import { MultihashIndexSortedWriter } from 'cardex/multihash-index-sorted'
import * as json from '@ipld/dag-json'
import { Map as LinkMap } from 'lnmap'
import * as Link from 'multiformats/link'
import { Parse } from 'ndjson-web'

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
 * Write an index for the provided indexed block.
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('../src/handlers/indexes').BlocklyIndexData} indexData
 */
export async function putBlockIndex (endpoint, http, indexData) {
  const res = await http.dispatchFetch(new URL(`/block/${indexData.block}`, endpoint).toString(), {
    method: 'PUT',
    // @ts-expect-error
    body: writeIndex(indexData)
  })
  assert.equal(res.status, 200)
}

/**
 * Index the blocks in the passed shards.
 * @param {URL} endpoint
 * @param {Dispatcher} http
 * @param {import('cardex/api').CARLink[]} shards
 */
export async function getIndexes (endpoint, http, shards) {
  const res = await http.dispatchFetch(new URL('/indexes', endpoint).toString(), {
    method: 'POST',
    body: json.encode(shards)
  })
  assert.equal(res.status, 200)
  assert(res.body)
  const ndjsonParser = /** @type {Parse<import('../src/handlers/indexes').BlocklyIndexData>} */(new Parse(json.parse))
  return res.body.pipeThrough(ndjsonParser)
}

/**
 * @param {import('../src/handlers/indexes').BlocklyIndexData} indexData
 * @returns {import('cardex/reader/api').Readable<Uint8Array>}
 */
export function writeIndex (indexData) {
  /** @type {import('../src/bindings').ShardIndex} */
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
