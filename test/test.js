/* eslint-env mocha */
import { Miniflare } from 'miniflare'
import assert from 'node:assert'
import fs from 'node:fs'
import { CID } from 'multiformats/cid'

const carCID = CID.parse('bagbaieradoadc65goax2aehjn73oevbx6cbxjl5xp7k4vii24635mxkki42q')
const rootCID = CID.parse('bafybeifsspna7evg6wtxfluwbt36c3e4yapq6vze3vaut2izwl72ombxrm')

describe('gendex', () => {
  /** @type {Miniflare} */
  let miniflare
  /** @type {Uint8Array} */
  let carFixture

  beforeEach(async () => {
    miniflare = new Miniflare({
      scriptPath: 'dist/worker.mjs',
      // packagePath: true,
      wranglerConfigPath: true,
      // We don't want to rebuild our worker for each test, we're already doing
      // it once before we run all tests in package.json, so disable it here.
      // This will override the option in wrangler.toml.
      // buildCommand: undefined,
      
      // wranglerConfigPath: 'test',
      modules: true,
      r2Buckets: ['CARPARK', 'SATNAV', 'DUDEWHERE']
      // r2Persist: true
    })

    carFixture = await fs.promises.readFile(`./test/fixtures/${carCID}.car`)
  })

  it('generates the indexes', async () => {
    const carPark = await miniflare.getR2Bucket('CARPARK')
    await carPark.put(`${carCID}/${carCID}.car`, carFixture)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/${rootCID}/${carCID}`, { method: 'POST' })
    assert.equal(res.status, 200)
    await assert.doesNotReject(res.json().then(console.log))

    const dudeWhere = await miniflare.getR2Bucket('DUDEWHERE')
    const dudeWhereMeta = await dudeWhere.head(`${rootCID}/${carCID}`)
    assert(dudeWhereMeta)
    console.log(dudeWhereMeta)

    const satNav = await miniflare.getR2Bucket('SATNAV')
    const satNavMeta = await satNav.head(`${carCID}/${carCID}.car.idx`)
    assert(satNavMeta)
    console.log(satNavMeta)
  })
})
