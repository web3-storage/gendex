import * as Link from 'multiformats/link'
import Queue from 'p-queue'
import retry from 'p-retry'
import { getBlockIndex, getBlockLinks, putBlockIndex } from '../test/helpers.js'
import { mhToString } from '../src/lib/multihash.js'

const CONCURRENCY = 50

async function main () {
  const endpoint = new URL(mustGetEnv('ENDPOINT'))
  const dispatcher = { dispatchFetch: fetch }
  const root = Link.parse(process.argv[2])
  console.log(`Building indexes for: ${root}`)
  const blockIndex = await getBlockIndex(endpoint, dispatcher, root)
  console.log(`Retrieved indexes for DAG of ${blockIndex.size} blocks`)
  const rootMh = mhToString(root.multihash)
  const rootLinks = await getBlockLinks(endpoint, dispatcher, blockIndex, rootMh)
  console.log(`Root block has ${rootLinks.length} links`)

  const queue = new Queue({ concurrency: CONCURRENCY })

  /** @param {{ multihash: import('../src/bindings').MultihashString, links: import('../src/bindings').MultihashString[] }} item */
  const createTask = item => async () => {
    console.log(`${queue.size} index${queue.size === 1 ? '' : 'es'} in queue to write`)
    console.log(`Writing block index for: ${item.multihash}`)
    const links = await retry(() => putBlockIndex(endpoint, dispatcher, blockIndex, item.multihash, item.links), {
      onFailedAttempt: err => console.warn(`failed put block index for: ${item.multihash}`, err)
    })
    console.log(`${item.multihash} has ${item.links.length} links`)
    for (const linkItem of links) {
      queue.add(createTask(linkItem))
    }
  }
  await queue.add(createTask({ multihash: rootMh, links: rootLinks }))
  await queue.onIdle()
}

function mustGetEnv (key) {
  const value = process.env[key]
  if (!value) throw new Error(`missing required environment variable: ${key}`)
  return value
}

main()
