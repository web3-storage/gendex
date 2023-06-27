/* eslint-env browser */
import Queue from 'p-queue'
import retry from 'p-retry'
import { getIndexes, putBlockIndexes } from '../../test/helpers.js'

/**
 * @param {URL} endpoint
 * @param {import('cardex/api.js').CARLink[]} shards
 */
export async function putBlocklyIndexes (endpoint, shards) {
  const dispatcher = { dispatchFetch: fetch }

  const queue = new Queue({ concurrency: 6 })
  /** @type {import('../../src/bindings').BlockIndexData[]} */
  let batch = []

  /** @param {import('../../src/bindings').BlockIndexData[]} batch */
  const addBatchToQueue = batch => queue.add(async () => {
    try {
      const start = Date.now()
      console.log(`Storing batch of ${batch.length}`)
      await retry(() => putBlockIndexes(endpoint, dispatcher, batch))
      console.log(`${batch.length} block indexes stored in ${Date.now() - start}ms!`)
    } catch (err) {
      console.error(err)
    }
  })

  const indexes = await getIndexes(endpoint, dispatcher, shards)

  await indexes.pipeTo(new WritableStream({
    write (indexData) {
      batch.push(indexData)
      console.log(`${indexData.block}: ${indexData.links.length} links`)
      if (batch.length >= 25) {
        addBatchToQueue(batch)
        batch = []
      }
    }
  }))

  if (batch.length) {
    addBatchToQueue(batch)
  }

  await queue.onIdle()
}
