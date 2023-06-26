/* eslint-env browser */
import * as json from '@ipld/dag-json'
import * as Link from 'multiformats/link'
import { CARReaderStream } from 'carstream'
import { Map as LinkMap } from 'lnmap'
import { Stringify } from 'ndjson-web'
import { decodeBlock } from '../lib/block'

/**
 * @typedef {{ shard: import('cardex/api').CARLink, block: import('multiformats').UnknownLink, offset: number, length: number }} IndexData
 * @typedef {IndexData & { links: IndexData[] }} BlocklyIndexData
 * @typedef {IndexData & { links: import('multiformats').UnknownLink[] }} BlockIndexData
 */

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings').Env} env
   */
  async fetch (request, env) {
    /** @type {import('cardex/api').CARLink[]} */
    const shards = json.decode(new Uint8Array(await request.arrayBuffer()))

    const iterator = (async function * () {
      for (const shard of shards) {
        const obj = await env.CARPARK.get(`${shard}/${shard}.car`)
        if (!obj) throw new Error(`missing shard: ${shard}`)
        // @ts-expect-error
        const blocks = obj.body.pipeThrough(new CARReaderStream())
        for await (const block of blocks) {
          if (!block) continue
          yield { shard, ...block }
        }
      }
    })()
    /** @type {ReadableStream<{ shard: import('cardex/api').CARLink } & import('carstream/api').Block & import('carstream/api').Position>} */
    const readable = new ReadableStream({
      async pull (controller) {
        const { value, done } = await iterator.next()
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      }
    })

    /** @type {Map<import('multiformats/link').UnknownLink, BlockIndexData>} */
    const blockIndex = new LinkMap()
    /** @type {Map<import('multiformats/link').UnknownLink, import('multiformats/link').UnknownLink[]>} */
    const missingTargets = new LinkMap()

    /**
     * @param {import('multiformats').UnknownLink} cid
     * @returns {BlocklyIndexData}
     */
    const toBlocklyIndex = cid => {
      const index = blockIndex.get(cid)
      if (!index) throw new Error(`missing index: ${cid}`)
      return {
        block: index.block,
        shard: index.shard,
        offset: index.offset,
        length: index.length,
        links: index.links.map(l => {
          const linkIndex = blockIndex.get(l)
          if (!linkIndex) throw new Error(`missing link index: ${l}`)
          return { block: l, shard: linkIndex.shard, offset: linkIndex.offset, length: linkIndex.length }
        })
      }
    }

    return new Response(
      readable
        .pipeThrough(new TransformStream({
          async transform ({ shard, cid, bytes, offset, length }, controller) {
            if (blockIndex.has(cid)) return
            const block = await decodeBlock({ cid: Link.decode(cid.bytes.slice()), bytes: bytes.slice() })
            const links = [...block.links()].map(([, cid]) => Link.decode(cid.bytes.slice()))
            blockIndex.set(block.cid, { block: block.cid, shard, offset, length, links })

            if (links.every(l => blockIndex.has(l))) {
              controller.enqueue(toBlocklyIndex(block.cid))
            }

            for (const link of links) {
              if (blockIndex.has(link)) continue
              let targets = missingTargets.get(link)
              if (!targets) {
                targets = []
                missingTargets.set(link, targets)
              }
              targets.push(block.cid)
            }

            const targets = missingTargets.get(block.cid)
            if (targets) {
              for (const target of targets) {
                const index = blockIndex.get(target)
                if (!index) throw new Error('missing block target')
                if (index.links.every(l => blockIndex.has(l))) {
                  controller.enqueue(toBlocklyIndex(target))
                }
              }
              missingTargets.delete(block.cid)
            }
          }
        }))
        .pipeThrough(new Stringify(json.stringify))
    )
  }
}
