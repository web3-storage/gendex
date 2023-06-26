import * as Block from 'multiformats/block'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { identity } from 'multiformats/hashes/identity'
import { blake2b256 } from '@multiformats/blake2/blake2b'
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
 * @param {import('carstream/api').Block} block
 */
export async function decodeBlock ({ cid, bytes }) {
  const decoder = Decoders[cid.code]
  if (!decoder) throw Object.assign(new Error(`missing decoder: ${cid.code}`), { code: 'ERR_MISSING_DECODER' })
  const hasher = Hashers[cid.multihash.code]
  if (!hasher) throw Object.assign(new Error(`missing hasher: ${cid.multihash.code}`), { code: 'ERR_MISSING_HASHER' })
  return await Block.create({ cid, bytes, codec: decoder, hasher })
}
