import * as Block from 'multiformats/block'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { identity } from 'multiformats/hashes/identity'
import { blake2b256 } from '@multiformats/blake2/blake2b'
import { readBlockHead, asyncIterableReader } from '@ipld/car/decoder'
import * as pb from '@ipld/dag-pb'
import * as cbor from '@ipld/dag-cbor'
import * as json from '@ipld/dag-json'

/** @type {import('../bindings').BlockDecoders} */
export const Decoders = {
  [raw.code]: raw,
  [pb.code]: pb,
  [cbor.code]: cbor,
  [json.code]: json
}

/** @type {import('../bindings').MultihashHashers} */
export const Hashers = {
  [identity.code]: identity,
  [sha256.code]: sha256,
  [blake2b256.code]: blake2b256
}

/**
 * @typedef {import('multiformats/link').ToString<import('multiformats').MultihashDigest, 'z'>} MultihashString
 * @typedef {string} ShardCID
 * @typedef {number} Offset
 */

// 2MB (max safe libp2p block size) + typical block header length + some leeway
const MAX_ENCODED_BLOCK_LENGTH = (1024 * 1024 * 2) + 39 + 61

/**
 * @param {import('@cloudflare/workers-types').R2Bucket} bucket
 * @param {string} shardCID
 * @param {number} offset
 */
export async function getBlock (bucket, shardCID, offset) {
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

  return await Block.create({ cid, bytes: bytes.slice(), codec: decoder, hasher })
}
