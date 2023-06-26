import { readBlockHead, asyncIterableReader } from '@ipld/car/decoder'
import { decodeBlock } from './block.js'

/**
 * @typedef {import('multiformats/link').ToString<import('multiformats').MultihashDigest, 'z'>} MultihashString
 * @typedef {string} ShardCID
 * @typedef {number} Offset
 */

// 2MB (max safe libp2p block size) + typical block header length + some leeway
const MAX_ENCODED_BLOCK_LENGTH = (1024 * 1024 * 2) + 39 + 61

/**
 * @param {import('@cloudflare/workers-types').R2Bucket} bucket
 * @param {import('cardex/api').CARLink} shard
 * @param {number} offset
 */
export async function getBlock (bucket, shard, offset) {
  const range = { offset, length: MAX_ENCODED_BLOCK_LENGTH }
  const res = await bucket.get(`${shard}/${shard}.car`, { range })
  if (!res) throw Object.assign(new Error(`missing shard: ${shard}`), { code: 'ERR_MISSING_SHARD' })

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

  return await decodeBlock({ cid, bytes })
}
