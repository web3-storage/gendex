import Queue from 'p-queue'
import retry from 'p-retry'
import * as dagpb from '@ipld/dag-pb'
import * as raw from 'multiformats/codecs/raw'
import { getBlockIndex, getBlockLinks, putBlockIndex } from '../../test/helpers.js'

const CONCURRENCY = 50
const MAX_BLOCK_LINKS = 3000

/**
 * @param {URL} endpoint
 * @param {import('multiformats/link').UnknownLink} root
 * @param {number} max Maximum number of blocks to index (throws if greater)
 */
export async function putBlocklyIndexes (endpoint, root, max = Infinity) {
  const dispatcher = { dispatchFetch: fetch }
  console.log(`Building indexes for: ${root}`)
  const blockIndex = await getBlockIndex(endpoint, dispatcher, root, max)
  console.log(`Retrieved indexes for DAG of ${blockIndex.size} blocks`)

  const { links: rootLinks } = await getBlockLinks(endpoint, dispatcher, blockIndex, root)
  console.log(`Root block has ${rootLinks.length} links`)
  if (rootLinks.length > MAX_BLOCK_LINKS) {
    throw new RangeError(`maximum single block links size exceeded ${rootLinks.length} > ${MAX_BLOCK_LINKS}`)
  }

  const queue = new Queue({ concurrency: CONCURRENCY })

  /** @param {{ cid: import('multiformats').UnknownLink, links: import('multiformats').UnknownLink[] }} item */
  const createTask = item => async () => {
    console.log(`${queue.size} index${queue.size === 1 ? '' : 'es'} in queue to write`)
    console.log(`Writing block index for: ${item.cid}`)
    const links = await retry(() => putBlockIndex(endpoint, dispatcher, blockIndex, item.cid, item.links), {
      onFailedAttempt: err => console.warn(`failed put block index for: ${item.cid}`, err)
    })

    console.log(`${item.cid} has ${item.links.length} links`)
    if (item.links.length > MAX_BLOCK_LINKS) {
      throw new RangeError(`maximum single block links size exceeded ${item.links.length} > ${MAX_BLOCK_LINKS}`)
    }

    for (const linkItem of links) {
      queue.add(createTask(linkItem))
    }
  }
  await queue.add(createTask({ cid: root, links: rootLinks }))
  await queue.onIdle()
}

/**
 * @param {URL} endpoint
 * @param {import('multiformats/link').UnknownLink} root
 * @param {number} max Maximum number of blocks to index (throws if greater)
 */
export async function putSmartBlocklyIndexes (endpoint, root, max = Infinity) {
  const dispatcher = { dispatchFetch: fetch }
  console.log(`Building indexes for: ${root}`)
  const blockIndex = await getBlockIndex(endpoint, dispatcher, root, max)
  console.log(`Retrieved indexes for DAG of ${blockIndex.size} blocks`)

  const { links: rootLinks, meta: rootMeta } = await getBlockLinks(endpoint, dispatcher, blockIndex, root)
  console.log(`Root block has ${rootLinks.length} links`)
  if (rootLinks.length > MAX_BLOCK_LINKS) {
    throw new RangeError(`maximum single block links size exceeded ${rootLinks.length} > ${MAX_BLOCK_LINKS}`)
  }

  const queue = new Queue({ concurrency: CONCURRENCY })

  /** @param {{ cid: import('multiformats').UnknownLink, links: import('multiformats').UnknownLink[], meta: any }} item */
  const createTask = item => async () => {
    console.log(`${queue.size} index${queue.size === 1 ? '' : 'es'} in queue to write`)
    console.log(`Writing block index for: ${item.cid}`)
    const links = await retry(() => putBlockIndex(endpoint, dispatcher, blockIndex, item.cid, item.links), {
      onFailedAttempt: err => console.warn(`failed put block index for: ${item.cid}`, err)
    })
    console.log(`${item.cid} has ${item.links.length} links`)
    if (item.links.length > MAX_BLOCK_LINKS) {
      throw new RangeError(`maximum single block links size exceeded ${item.links.length} > ${MAX_BLOCK_LINKS}`)
    }

    const isFile = item.cid.code === dagpb.code && item.meta.type === 'file'
    const isDirectory = item.cid.code === dagpb.code && item.meta.type?.includes('directory')

    for (const linkItem of links) {
      // Always index each directory link
      if (isDirectory) {
        queue.add(createTask(linkItem))
      // Index file link if not pointing to raw data
      } else if (isFile) {
        if (linkItem.cid.code !== raw.code) {
          queue.add(createTask(linkItem))
        }
      } else {
        queue.add(createTask(linkItem))
      }
    }
  }
  await queue.add(createTask({ cid: root, links: rootLinks, meta: rootMeta }))
  await queue.onIdle()
}
