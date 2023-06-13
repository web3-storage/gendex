/* eslint-env mocha */
import { Miniflare } from 'miniflare'
import assert from 'node:assert'
import fs from 'node:fs'
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import { equals } from 'multiformats/bytes'
import { MultiIndexReader } from 'cardex/multi-index'
import { mhToString } from '../src/lib/multihash.js'

const shard = Link.parse('bagbaieradoadc65goax2aehjn73oevbx6cbxjl5xp7k4vii24635mxkki42q')
const root = Link.parse('bafybeifsspna7evg6wtxfluwbt36c3e4yapq6vze3vaut2izwl72ombxrm')

describe('gendex', () => {
  /** @type {Miniflare} */
  let miniflare
  /** @type {Uint8Array} */
  let shardFixture

  beforeEach(async () => {
    miniflare = new Miniflare({
      scriptPath: 'dist/worker.mjs',
      // packagePath: true,
      wranglerConfigPath: true,
      // We don't want to rebuild our worker for each test, we're already doing
      // it once before we run all tests in package.json, so disable it here.
      // This will override the option in wrangler.toml.
      buildCommand: undefined,

      // wranglerConfigPath: 'test',
      modules: true,
      r2Buckets: ['CARPARK', 'SATNAV', 'DUDEWHERE', 'BLOCKLY']
      // ,r2Persist: true
    })

    shardFixture = await fs.promises.readFile(`./test/fixtures/${shard}.car`)
  })

  it('generates shard indexes', async () => {
    const carPark = await miniflare.getR2Bucket('CARPARK')
    await carPark.put(`${shard}/${shard}.car`, shardFixture)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/shard/${root}/${shard}`, { method: 'POST' })
    assert.equal(res.status, 200)
    await assert.doesNotReject(res.json().then(console.log))

    const dudeWhere = await miniflare.getR2Bucket('DUDEWHERE')
    const dudeWhereMeta = await dudeWhere.head(`${root}/${shard}`)
    assert(dudeWhereMeta)
    console.log(dudeWhereMeta)

    const satNav = await miniflare.getR2Bucket('SATNAV')
    const satNavMeta = await satNav.head(`${shard}/${shard}.car.idx`)
    assert(satNavMeta)
    console.log(satNavMeta)
  })

  it('generates block indexes', async () => {
    const carPark = await miniflare.getR2Bucket('CARPARK')
    await carPark.put(`${shard}/${shard}.car`, shardFixture)

    const res0 = await miniflare.dispatchFetch(`http://localhost:8787/shard/${root}/${shard}`, { method: 'POST' })
    assert.equal(res0.status, 200)

    const res1 = await miniflare.dispatchFetch(`http://localhost:8787/blocks/${root}`, { method: 'POST' })
    assert.equal(res1.status, 200)
    await assert.doesNotReject(res1.json().then(console.log))

    const blockly = await miniflare.getR2Bucket('BLOCKLY')
    const mhashes = [root.multihash]
    while (true) {
      const mh = mhashes.shift()
      if (!mh) break

      const res = await blockly.get(`${mhToString(mh)}/${mhToString(mh)}.idx`)
      assert(res)

      const reader = MultiIndexReader.createReader({ reader: res.body.getReader() })
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        // @ts-expect-error
        if (!equals(value.multihash.bytes, mh.bytes)) {
          // @ts-expect-error
          console.log(`  ${Link.create(raw.code, value.multihash).toString()} (${value.origin} @ ${value.offset})`)
          // @ts-expect-error
          mhashes.push(value.multihash)
        }
      }
    }
  })
})
