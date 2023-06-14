import { equals } from 'multiformats/bytes'

const MAX_BYTES_BETWEEN = 1024 * 1024 * 2
const MAX_BATCH_SIZE = 10

/**
 * @typedef {import('multiformats').UnknownLink} UnknownLink
 * @typedef {import('cardex/multi-index/api').MultiIndexItem & import('cardex/multihash-index-sorted/api').MultihashIndexItem} BatchItem
 * @typedef {{ add: (i: BatchItem) => void, remove: (cid: UnknownLink) => void, next: () => BatchItem[] }} BlockBatcher
 */

/**
 * Batcher for blocks in CARs. Batches are grouped by CAR CID and blocks are
 * returned in batches in the order they were inserted.
 * @implements {BlockBatcher}
 */
export class OrderedCarBlockBatcher {
  /** @type {BatchItem[]} */
  #queue = []

  /** @param {BatchItem} item */
  add (item) {
    this.#queue.push(item)
  }

  /** @param {UnknownLink} cid */
  remove (cid) {
    this.#queue = this.#queue.filter(item => !equals(item.multihash.bytes, cid.multihash.bytes))
  }

  next () {
    const queue = this.#queue
    let prevItem = queue.shift()
    if (!prevItem) return []
    const batch = [prevItem]
    while (true) {
      const item = queue.at(0)
      if (!item) break
      if (item.origin.toString() !== prevItem.origin.toString() || item.offset - prevItem.offset >= MAX_BYTES_BETWEEN) {
        break
      }
      batch.push(item)
      queue.shift() // remove from the queue
      if (batch.length >= MAX_BATCH_SIZE) break
      prevItem = item
    }
    return batch
  }
}
