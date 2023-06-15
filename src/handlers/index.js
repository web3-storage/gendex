/* eslint-env browser */
import * as Link from 'multiformats/link'
import { MultiIndexWriter } from 'cardex/multi-index'
import { encodeVarint } from 'cardex/encoder'
import { ErrorResponse } from '../lib/errors.js'
import { listAll } from '../lib/r2.js'

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings').Env} env
   * @param {unknown} ctx
   */
  async fetch (request, env, ctx) {
    const reqURL = new URL(request.url)
    const pathParts = reqURL.pathname.split('/')
    /** @type {import('multiformats').UnknownLink} */
    let root
    try {
      root = Link.parse(pathParts[2]).toV1()
    } catch (err) {
      return new ErrorResponse('invalid CID', 400)
    }

    const shardKeys = await listAll(env.DUDEWHERE, `${root}/`)
    if (!shardKeys.length) return new ErrorResponse(`not indexed: ${root}`, 404)

    const shards = shardKeys
      .map(k => k.replace(`${root}/`, ''))
      .filter(k => !k.startsWith('.'))
      .map(k => Link.parse(k))

    const indexGenerator = async function * () {
      yield encodeVarint(MultiIndexWriter.codec)
      yield encodeVarint(shards.length)
      for (const origin of shards) {
        yield origin.multihash.bytes
        const idx = await env.SATNAV.get(`${origin}/${origin}.car.idx`)
        if (!idx) throw new Error(`missing index: ${origin}`)
        yield * idx.body
      }
    }

    const iterator = indexGenerator()
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

    return new Response(readable)
  }
}
