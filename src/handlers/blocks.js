/* eslint-env browser */
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import { identity } from 'multiformats/hashes/identity'
import { blake2b256 } from '@multiformats/blake2/blake2b'
import * as Digest from 'multiformats/hashes/digest'
import { base58btc } from 'multiformats/bases/base58'
import { readBlockHead, asyncIterableReader } from '@ipld/car/decoder'
import * as pb from '@ipld/dag-pb'
import * as cbor from '@ipld/dag-cbor'
import * as json from '@ipld/dag-json'
import { MultihashIndexSortedReader, MultihashIndexSortedWriter } from 'cardex'
import { MultiIndexWriter } from 'cardex/multi-index'
import { ErrorResponse } from '../lib/errors.js'
import { listAll } from '../lib/r2.js'
import { mhToString } from '../lib/multihash.js'
import { streamToBlob } from '../lib/stream.js'

/** @type {import('../bindings').BlockDecoders} */
const Decoders = {
  [raw.code]: raw,
  [pb.code]: pb,
  [cbor.code]: cbor,
  [json.code]: json
}

/** @type {import('../bindings').MultihashHashers} */
const Hashers = {
  [identity.code]: identity,
  [sha256.code]: sha256,
  [blake2b256.code]: blake2b256
}

/**
 * @typedef {import('multiformats').ToString<import('multiformats').MultihashDigest, 'z'>} MultihashString
 * @typedef {import('multiformats').ToString<import('cardex/api.js').CARLink>} ShardCID
 * @typedef {number} Offset
 */

// 2MB (max safe libp2p block size) + typical block header length + some leeway
const MAX_ENCODED_BLOCK_LENGTH = (1024 * 1024 * 2) + 39 + 61

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings').Env} env
   * @param {unknown} ctx
   */
  async fetch (request, env, ctx) {
    /** @type {Map<MultihashString, Map<ShardCID, Offset>>} */
    const blockIndex = new Map()

    const reqURL = new URL(request.url)
    const pathParts = reqURL.pathname.split('/')
    /** @type {import('multiformats').UnknownLink} */
    let root
    try {
      root = Link.parse(pathParts[2]).toV1()
    } catch (err) {
      return new ErrorResponse('invalid CID', 400)
    }

    const shardKeys = await listAll(env.DUDEWHERE, `${root}/`)
    const shards = shardKeys.map(k => k.replace(`${root}/`, '')).filter(k => !k.startsWith('.'))
    for (const shardCID of shards) {
      const res = await env.SATNAV.get(`${shardCID}/${shardCID}.car.idx`)
      if (!res) return new ErrorResponse(`missing SATNAV index: ${shardCID}`, 404)
      const reader = MultihashIndexSortedReader.createReader({ reader: res.body.getReader() })
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const blockMh = mhToString(value.multihash)
        let offsets = blockIndex.get(blockMh)
        if (!offsets) {
          /** @type {Map<ShardCID, Offset>} */
          offsets = new Map()
          blockIndex.set(blockMh, offsets)
        }
        offsets.set(shardCID, value.offset)
      }
    }

    for (const [blockMh, offsets] of blockIndex) {
      const key = `${blockMh}/${blockMh}.idx`
      if (await env.BLOCKLY.head(key)) continue

      const [parentShard, offset] = getAnyMapEntry(offsets)
      /** @type {Map<ShardCID, Map<MultihashString, Offset>>} */
      const shardIndex = new Map([[parentShard, new Map([[blockMh, offset]])]])
      let block
      try {
        block = await getBlock(env.CARPARK, parentShard, offset)
      } catch (err) {
        if (err.code === 'ERR_MISSING_SHARD') return new ErrorResponse(err.message, 404)
        throw err
      }
      for (const [, cid] of block.links()) {
        const linkMh = mhToString(cid.multihash)
        const offsets = blockIndex.get(linkMh)
        if (!offsets) return new ErrorResponse(`block not indexed: ${cid}`, 404)
        const [shard, offset] = offsets.has(parentShard) ? [parentShard, offsets.get(parentShard) ?? 0] : getAnyMapEntry(offsets)
        let blocks = shardIndex.get(shard)
        if (!blocks) {
          blocks = new Map()
          shardIndex.set(shard, blocks)
        }
        blocks.set(linkMh, offset)
      }

      const { readable, writable } = new TransformStream()
      const writer = MultiIndexWriter.createWriter({ writer: writable.getWriter() })

      for (const [shardCID, blocks] of shardIndex.entries()) {
        writer.add(Link.parse(shardCID), async ({ writer }) => {
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
          const blob = await streamToBlob(readable)
          // @ts-expect-error
          await env.BLOCKLY.put(key, blob.stream())
        })()
      ])
    }

    return new Response(json.encode({
      root,
      blocks: [...blockIndex.keys()].map(mh => Link.create(raw.code, Digest.decode(base58btc.decode(mh)))),
      shards: shards.map(cid => Link.parse(cid))
    }), { headers: { 'Content-Type': 'application/json' } })
  }
}

/**
 * @template K
 * @template V
 * @param {Map<K, V>} map
 */
function getAnyMapEntry (map) {
  const { done, value } = map.entries().next()
  if (done) throw new Error('empty map')
  return value
}

/**
 * @param {import('@cloudflare/workers-types').R2Bucket} bucket
 * @param {string} shardCID
 * @param {number} offset
 */
async function getBlock (bucket, shardCID, offset) {
  const range = { offset, length: MAX_ENCODED_BLOCK_LENGTH }
  const res = await bucket.get(`${shardCID}/${shardCID}.car`, { range })
  if (!res) throw Object.assign(new Error(`missing shard: ${shardCID}`), { code: 'ERR_MISSING_SHARD' })

  const reader = res.body.getReader()
  const bytesReader = asyncIterableReader((async function * () {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      yield value
    }
  })())

  const { cid, blockLength } = await readBlockHead(bytesReader)
  const bytes = await bytesReader.exactly(blockLength)
  reader.cancel()

  const decoder = Decoders[cid.code]
  if (!decoder) throw Object.assign(new Error(`missing decoder: ${cid.code}`), { code: 'ERR_MISSING_DECODER' })
  const hasher = Hashers[cid.multihash.code]
  if (!hasher) throw Object.assign(new Error(`missing hasher: ${cid.multihash.code}`), { code: 'ERR_MISSING_HASHER' })

  return await Block.decode({ bytes, codec: decoder, hasher })
}
