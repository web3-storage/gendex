/* eslint-env browser */
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import { identity } from 'multiformats/hashes/identity'
import { blake2b256 } from '@multiformats/blake2/blake2b'
import * as Digest from 'multiformats/hashes/digest'
import { base58btc } from 'multiformats/bases/base58'
import { fromString, toString } from 'multiformats/bytes'
import * as pb from '@ipld/dag-pb'
import * as cbor from '@ipld/dag-cbor'
import * as json from '@ipld/dag-json'
import { MultihashIndexSortedWriter } from 'cardex'
import { MultiIndexWriter } from 'cardex/multi-index'
import { transform } from 'streaming-iterables'
import hashlru from 'hashlru'
import { ErrorResponse } from '../lib/errors.js'
import { listAll } from '../lib/r2.js'
import { mhToString } from '../lib/multihash.js'
import { iteratorToStream, streamToBlob } from '../lib/stream.js'
import { MultiCarIndex, CarIndex } from '../lib/car-index.js'
import { BatchingR2Blockstore } from '../lib/blockstore.js'

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

const CONCURRENCY = 10
const MAX_CACHED_RECENT_INDEXES = 10_000

const recentIndexes = hashlru(MAX_CACHED_RECENT_INDEXES)

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings').Env} env
   * @param {unknown} ctx
   */
  async fetch (request, env, ctx) {
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

    /** @type {import('../bindings').IndexSource[]} */
    const indexSources = shards.map(shardCID => {
      const key = `${shardCID}/${shardCID}.car.idx`
      return { origin: Link.parse(shardCID), bucket: env.SATNAV, key }
    })

    const multiIndex = new MultiCarIndex()
    const indexes = await Promise.all(indexSources.map(src => CarIndex.fromIndexSource(src)))
    indexes.forEach(i => multiIndex.addIndex(i))
    const blockstore = new BatchingR2Blockstore(env.CARPARK, multiIndex)

    return new Response(iteratorToStream((async function * () {
      try {
        const indexedBlocks = transform(CONCURRENCY, async ({ origin, multihash, offset }) => {
          const blockMh = mhToString(multihash)
          const key = `${blockMh}/${blockMh}.idx`
          if (recentIndexes.has(blockMh) || await env.BLOCKLY.head(key)) {
            return { multihash: blockMh }
          }

          const rawBlock = await blockstore.get(Link.create(raw.code, multihash))
          if (!rawBlock) throw new Error(`missing index data for block: ${blockMh}`)
          const block = await decodeBlock(rawBlock)

          /** @type {Map<string, Map<MultihashString, Offset>>} */
          const shardIndex = new Map([[origin.toString(), new Map([[blockMh, offset]])]])

          for (const [, cid] of block.links()) {
            const linkMh = mhToString(cid.multihash)
            const indexItem = multiIndex.get(cid)
            if (!indexItem) throw new Error(`missing index data for block: ${linkMh}`)

            let blocks = shardIndex.get(indexItem.origin.toString())
            if (!blocks) {
              blocks = new Map()
              shardIndex.set(indexItem.origin.toString(), blocks)
            }
            blocks.set(linkMh, indexItem.offset)
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

          recentIndexes.set(blockMh, true)
          return { multihash: blockMh }
        }, multiIndex.values())

        for await (const block of indexedBlocks) {
          yield ndjsonEncode(block)
        }
      } catch (err) {
        console.error(err)
        yield ndjsonEncode({ error: err.message })
        throw err
      }
    })()), { headers: { 'Content-Type': 'application/x-ndjson' } })
  }
}

/**
 * @param {{ cid: import('multiformats').UnknownLink, bytes: Uint8Array }} block
 */
async function decodeBlock ({ cid, bytes }) {
  const decoder = Decoders[cid.code]
  if (!decoder) throw Object.assign(new Error(`missing decoder: ${cid.code}`), { code: 'ERR_MISSING_DECODER' })
  const hasher = Hashers[cid.multihash.code]
  if (!hasher) throw Object.assign(new Error(`missing hasher: ${cid.multihash.code}`), { code: 'ERR_MISSING_HASHER' })
  return await Block.decode({ bytes, codec: decoder, hasher })
}

/** @param {any} data */
function ndjsonEncode (data) {
  return fromString(`${toString(json.encode(data))}\n`)
}
