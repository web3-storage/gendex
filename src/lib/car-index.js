import { base58btc } from 'multiformats/bases/base58'
import { MultihashIndexSortedReader } from 'cardex/multihash-index-sorted'

/**
 * @typedef {import('multiformats').UnknownLink} UnknownLink
 * @typedef {import('cardex/multi-index/api').MultiIndexItem & import('cardex/multihash-index-sorted/api').MultihashIndexItem} IndexItem
 * @typedef {import('multiformats').ToString<import('multiformats').MultihashDigest, 'z'>} MultihashString
 * @typedef {{ get: (c: UnknownLink) => IndexItem|undefined, values: () => IterableIterator<IndexItem> }} CarIndexer
 */

/** @implements {CarIndexer} */
export class MultiCarIndex {
  /** @type {CarIndexer[]} */
  #idxs

  constructor () {
    this.#idxs = []
  }

  /**
   * @param {CarIndexer} index
   */
  addIndex (index) {
    this.#idxs.push(index)
  }

  * values () {
    const seen = new Set()
    for (const idx of this.#idxs) {
      for (const item of idx.values()) {
        const blockMh = mhToString(item.multihash)
        if (seen.has(blockMh)) continue
        yield item
        seen.add(blockMh)
      }
    }
  }

  /**
   * @param {UnknownLink} cid
   * @returns {IndexItem | undefined}
   */
  get (cid) {
    for (const idx of this.#idxs) {
      const item = idx.get(cid)
      if (item) return item
    }
  }
}

/** @implements {CarIndexer} */
export class CarIndex {
  /** @type {Map<MultihashString, IndexItem>} */
  #idx

  /** @param {Map<MultihashString, IndexItem>} idx */
  constructor (idx) {
    this.#idx = idx
  }

  * values () {
    yield * this.#idx.values()
  }

  /** @param {UnknownLink} cid */
  get (cid) {
    const key = mhToString(cid.multihash)
    const entry = this.#idx.get(key)
    if (entry != null) return entry
  }

  /** @param {import('../bindings').IndexSource} source */
  static async fromIndexSource (source) {
    /** @type {Map<MultihashString, IndexItem>} */
    const idx = new Map()
    const idxObj = await source.bucket.get(source.key)
    if (!idxObj) {
      throw Object.assign(new Error(`index not found: ${source.key}`), { code: 'ERR_MISSING_INDEX' })
    }
    const idxReader = MultihashIndexSortedReader.createReader({ reader: idxObj.body.getReader() })
    while (true) {
      const { done, value } = await idxReader.read()
      if (done) break
      const entry = /** @type {IndexItem} */(Object.assign(value, { origin: source.origin }))
      idx.set(mhToString(entry.multihash), entry)
    }
    return new CarIndex(idx)
  }
}

/**
 * Multibase encode a multihash with base58btc.
 * @param {import('multiformats').MultihashDigest} mh
 * @returns {import('multiformats').ToString<import('multiformats').MultihashDigest, 'z'>}
 */
const mhToString = mh => base58btc.encode(mh.bytes)
