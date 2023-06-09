import { CID } from 'multiformats/cid'
import { encode } from '@ipld/dag-json'
import { CarIndexer } from '@ipld/car/indexer'
import { MultihashIndexSortedWriter } from 'cardex'
import { ErrorResponse } from '../lib/errors.js'
import { listAll } from '../lib/r2.js'

const CAR_CODEC = 0x0202

export default {
  /**
   * @param {Request} request
   * @param {import('../bindings.js').Env} env
   * @param {unknown} ctx
   */
  async fetch (request, env, ctx) {
    const reqURL = new URL(request.url)
    const pathParts = reqURL.pathname.split('/')
    /** @type {import('multiformats').UnknownLink} */
    let root
    try {
      root = CID.parse(pathParts[2]).toV1()
    } catch (err) {
      return new ErrorResponse('invalid CID', 400)
    }

    /** @type {import('multiformats').Link} */
    let shard
    try {
      shard = CID.parse(pathParts[3])
    } catch (err) {
      return new ErrorResponse('invalid CAR CID', 400)
    }
    if (shard.code !== CAR_CODEC) {
      return new ErrorResponse(`not a CAR CID: ${shard}`, 400)
    }

    const carParkKey = `${shard}/${shard}.car`
    const shardMeta = await env.CARPARK.head(carParkKey)
    if (!shardMeta) {
      return new ErrorResponse('CAR not found', 404)
    }

    const satNavKey = `${shard}/${shard}.car.idx`
    let satNavMeta = await env.SATNAV.head(satNavKey)
    if (!satNavMeta) {
      const res = await env.CARPARK.get(carParkKey)
      if (!res) {
        return new ErrorResponse('CAR not found', 404)
      }

      const indexer = await CarIndexer.fromIterable(res.body)
      const { readable, writable } = new TransformStream()
      const writer = MultihashIndexSortedWriter.createWriter({ writer: writable.getWriter() })

      ;(async () => {
        for await (const { cid, offset } of indexer) {
          await writer.add(cid, offset)
        }
        await writer.close()
      })()

      // @ts-expect-error
      await env.SATNAV.put(satNavKey, readable)

      satNavMeta = await env.SATNAV.head(satNavKey)
      if (!satNavMeta) {
        return new ErrorResponse('index not found after creation', 500)
      }
    }

    const shardKeys = await listAll(env.DUDEWHERE, `${root}/`)
    const dudeWhereKey = `${root}/${shard}`
    if (!shardKeys.includes(dudeWhereKey)) {
      await env.DUDEWHERE.put(dudeWhereKey, new Uint8Array())
      shardKeys.push(dudeWhereKey)
    }

    return new Response(encode({
      root: root,
      shard,
      shard_size: shardMeta.size,
      index_size: satNavMeta.size,
      shards: shardKeys.map(k => k.replace(`${root}/`, '')).map(cid => CID.parse(cid))
    }), { headers: { 'Content-Type': 'application/json' } })
  }
}
