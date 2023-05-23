/**
 * Usage:
 *   POST /bafyDAGRootCID/bagyCARCID
 * (Dudewhere format)
 */
import { CID } from 'multiformats/cid'
import { encode } from '@ipld/dag-json'
import { CarIndexer } from '@ipld/car/indexer'
import { MultihashIndexSortedWriter } from 'cardex'

/**
 * @typedef {{
 *   CARPARK: import('@cloudflare/workers-types').R2Bucket
 *   SATNAV: import('@cloudflare/workers-types').R2Bucket
 *   DUDEWHERE: import('@cloudflare/workers-types').R2Bucket
 * }} Env
 */

const CAR_CODEC = 0x0202
const jsonContent = { 'Content-Type': 'application/json' }

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {unknown} ctx
   */
  async fetch (request, env, ctx) {
    if (request.method !== 'POST') {
      return new ErrorResponse('method not allowed', 405)
    }

    const reqURL = new URL(request.url)
    /** @type {import('multiformats').UnknownLink} */
    let rootCID
    try {
      rootCID = CID.parse(reqURL.pathname.split('/')[1])
    } catch (err) {
      return new ErrorResponse('invalid CID', 400)
    }

    /** @type {import('multiformats').Link} */
    let carCID
    try {
      carCID = CID.parse(reqURL.pathname.split('/')[2])
    } catch (err) {
      return new ErrorResponse('invalid CAR CID', 400)
    }
    if (carCID.code !== CAR_CODEC) {
      return new ErrorResponse(`not a CAR CID: ${carCID}`, 400)
    }

    const carParkKey = `${carCID}/${carCID}.car`
    const carMeta = await env.CARPARK.head(carParkKey)
    if (!carMeta) {
      return new ErrorResponse('CAR not found', 404)
    }

    const satNavKey = `${carCID}/${carCID}.car.idx`
    let satNavMeta = await env.SATNAV.head(satNavKey)
    if (!satNavMeta) {
      const res = await env.CARPARK.get(carParkKey)
      if (!res) {
        return new ErrorResponse('CAR not found', 404)
      }

      const indexer = await CarIndexer.fromIterable(res.body)
      const { writer, out } = MultihashIndexSortedWriter.create()

      ;(async () => {
        for await (const blockIndexData of indexer) {
          await writer.put(blockIndexData)
        }
        await writer.close()
      })()

      const chunks = []
      for await (const chunk of out) {
        chunks.push(chunk)
      }

      // @ts-expect-error
      await env.SATNAV.put(satNavKey, new Blob(chunks))

      satNavMeta = await env.SATNAV.head(satNavKey)
      if (!satNavMeta) {
        return new ErrorResponse('index not found after creation', 500)
      }
    }

    const carKeys = await listAll(env.DUDEWHERE, `${rootCID}/`)
    const dudeWhereKey = `${rootCID}/${carCID}`
    if (!carKeys.includes(dudeWhereKey)) {
      await env.DUDEWHERE.put(dudeWhereKey, new Uint8Array())
      carKeys.push(dudeWhereKey)
    }

    return new Response(encode({
      root: rootCID,
      car: carCID,
      car_size: carMeta.size,
      index_size: satNavMeta.size,
      origin_cars: carKeys.map(k => k.replace(`${rootCID}/`, '')).map(cid => CID.parse(cid))
    }), { headers: jsonContent })
  }
}

class ErrorResponse extends Response {
  /**
   * @param {string} message 
   * @param {number} status 
   */
  constructor (message, status) {
    super(encode({ error: message }), { status, headers: jsonContent })
  }
}

/**
 * @param {import('@cloudflare/workers-types').R2Bucket} bucket
 * @param {string} prefix
 */
async function listAll (bucket, prefix) {
  const entries = []
  /** @type {string|undefined} */
  let cursor
  while (true) {
    const results = await bucket.list({ prefix, cursor })
    if (!results || !results.objects.length) break
    entries.push(...results.objects.map(o => o.key))
    if (!results.truncated) break
    cursor = results.cursor
  }
  return entries
}
