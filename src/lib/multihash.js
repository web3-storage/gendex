import { base58btc } from 'multiformats/bases/base58'

/**
 * Multibase encode a multihash with base58btc.
 * @param {import('multiformats').MultihashDigest} mh
 * @returns {import('multiformats').ToString<import('multiformats').MultihashDigest, 'z'>}
 */
export const mhToString = mh => base58btc.encode(mh.bytes)
