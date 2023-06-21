/* eslint-env browser */
import { MultiIndexWriter } from 'cardex/multi-index'
import { encodeVarint } from 'cardex/encoder'
import * as json from '@ipld/dag-json'

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings').Env} env
   */
  async fetch (request, env) {
    const shards = json.decode(new Uint8Array(await request.arrayBuffer()))

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
