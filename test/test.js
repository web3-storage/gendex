/* eslint-env mocha, browser */
import { Miniflare } from 'miniflare'
import assert from 'node:assert'
import fs from 'node:fs'
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import { equals } from 'multiformats/bytes'
import * as Digest from 'multiformats/hashes/digest'
import { sha256 } from 'multiformats/hashes/sha2'
import { MultiIndexReader } from 'cardex/multi-index'
import { mhToString } from '../src/lib/multihash.js'
import { putShardIndex, getIndex, getBlockLinks, putBlockIndex } from './helpers.js'

const endpoint = new URL('http://localhost:8787')
const fixtures = {
  single: {
    root: Link.parse('bafybeifsspna7evg6wtxfluwbt36c3e4yapq6vze3vaut2izwl72ombxrm'),
    /** @type {import('cardex/api').CARLink[]} */
    shards: [Link.parse('bagbaieradoadc65goax2aehjn73oevbx6cbxjl5xp7k4vii24635mxkki42q')]
  },
  multi: {
    root: Link.parse('bafybeicpxveeln3sd4scqlacrunxhzmvslnbgxa72evmqg7r27emdek464'),
    /** @type {import('cardex/api').CARLink[]} */
    shards: [
      Link.parse('bagbaieraur6bggahneqqptodwweu4azhki6iqhbi6botmmcz4f5oacv32h7q'),
      Link.parse('bagbaieravlhwgwouaizt2zzwth6jdkerv5wolyxyuq4jxpvq3dasmlglgr7a'),
      Link.parse('bagbaierazppyh2zaivwielliv5rshagkcabi4cnxrbaa62pq2fa2pt5qz2sa')
    ]
  }
}

describe('gendex', () => {
  /** @type {Miniflare} */
  let miniflare
  /** @type {import('./helpers').Dispatcher} */
  let dispatcher

  beforeEach(async () => {
    miniflare = new Miniflare({
      scriptPath: 'dist/worker.mjs',
      // packagePath: true,
      wranglerConfigPath: true,
      // We don't want to rebuild our worker for each test, we're already doing
      // it once before we run all tests in package.json, so disable it here.
      // This will override the option in wrangler.toml.
      buildCommand: undefined,
      globalAsyncIO: true,
      // wranglerConfigPath: 'test',
      modules: true,
      r2Buckets: ['CARPARK', 'SATNAV', 'DUDEWHERE', 'BLOCKLY']
      // ,r2Persist: true
    })
    /** @ts-expect-error */
    dispatcher = miniflare
  })

  it('generates shard indexes', async () => {
    const carPark = await miniflare.getR2Bucket('CARPARK')
    await carPark.put(
      `${fixtures.single.shards[0]}/${fixtures.single.shards[0]}.car`,
      await fs.promises.readFile(`./test/fixtures/${fixtures.single.shards[0]}.car`)
    )

    const res = await putShardIndex(endpoint, dispatcher, fixtures.single.root, fixtures.single.shards[0])
    await assert.doesNotReject(res.json().then(console.log))

    const dudeWhere = await miniflare.getR2Bucket('DUDEWHERE')
    const dudeWhereMeta = await dudeWhere.head(`${fixtures.single.root}/${fixtures.single.shards[0]}`)
    assert(dudeWhereMeta)
    console.log(dudeWhereMeta)

    const satNav = await miniflare.getR2Bucket('SATNAV')
    const satNavMeta = await satNav.head(`${fixtures.single.shards[0]}/${fixtures.single.shards[0]}.car.idx`)
    assert(satNavMeta)
    console.log(satNavMeta)
  })

  it('generates block indexes', async () => {
    const carPark = await miniflare.getR2Bucket('CARPARK')
    await carPark.put(
      `${fixtures.single.shards[0]}/${fixtures.single.shards[0]}.car`,
      await fs.promises.readFile(`./test/fixtures/${fixtures.single.shards[0]}.car`)
    )

    await putShardIndex(endpoint, dispatcher, fixtures.single.root, fixtures.single.shards[0])

    const blockIndex = await getIndex(endpoint, dispatcher, fixtures.single.shards)
    const rootLinks = await getBlockLinks(endpoint, dispatcher, blockIndex, fixtures.single.root)

    /** @type {Array<{ cid: import('multiformats').UnknownLink, links: import('multiformats').UnknownLink[] }>} */
    const queue = [{ cid: fixtures.single.root, links: rootLinks }]
    while (true) {
      const item = queue.shift()
      if (!item) break

      await putBlockIndex(endpoint, dispatcher, blockIndex, item.cid, item.links)

      for (const cid of item.links) {
        const links = await getBlockLinks(endpoint, dispatcher, blockIndex, cid)
        queue.push({ cid, links })
      }
    }

    const blockly = await miniflare.getR2Bucket('BLOCKLY')
    const mhashes = [fixtures.single.root.multihash]
    while (true) {
      const blockMh = mhashes.shift()
      if (!blockMh) break

      const indexRes = await blockly.get(`${mhToString(blockMh)}/.idx`)
      assert(indexRes, `missing index: ${mhToString(blockMh)}/.idx`)
      const indexMh = await sha256.digest(new Uint8Array(await indexRes.arrayBuffer()))

      const res = await blockly.get(`${mhToString(blockMh)}/${mhToString(indexMh)}.idx`)
      assert(res, `missing index: ${mhToString(blockMh)}/${mhToString(indexMh)}.idx`)

      const reader = MultiIndexReader.createReader({ reader: res.body.getReader() })
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        // @ts-expect-error
        if (!equals(value.multihash.bytes, blockMh.bytes)) {
          // @ts-expect-error
          console.log(`  ${value.origin}: ${Link.create(raw.code, value.multihash).toString()} @ ${value.offset}`)
          // @ts-expect-error
          mhashes.push(value.multihash)
        }
      }
    }
  })

  it('generates block indexes for multiple shards', async () => {
    const carPark = await miniflare.getR2Bucket('CARPARK')
    for (const shard of fixtures.multi.shards) {
      await carPark.put(
        `${shard}/${shard}.car`,
        await fs.promises.readFile(`./test/fixtures/${shard}.car`)
      )
      await putShardIndex(endpoint, dispatcher, fixtures.multi.root, shard)
    }

    const blockIndex = await getIndex(endpoint, dispatcher, fixtures.multi.shards)
    const rootLinks = await getBlockLinks(endpoint, dispatcher, blockIndex, fixtures.multi.root)

    /** @type {Array<{ cid: import('multiformats').UnknownLink, links: import('multiformats').UnknownLink[] }>} */
    const queue = [{ cid: fixtures.multi.root, links: rootLinks }]
    while (true) {
      const item = queue.shift()
      if (!item) break

      await putBlockIndex(endpoint, dispatcher, blockIndex, item.cid, item.links)

      for (const cid of item.links) {
        const links = await getBlockLinks(endpoint, dispatcher, blockIndex, cid)
        queue.push({ cid, links })
      }
    }

    const blockly = await miniflare.getR2Bucket('BLOCKLY')
    const mhashes = [fixtures.multi.root.multihash]
    while (true) {
      const blockMh = mhashes.shift()
      if (!blockMh) break

      const indexRes = await blockly.get(`${mhToString(blockMh)}/.idx`)
      assert(indexRes, `missing index: ${mhToString(blockMh)}/.idx`)
      const indexMh = await sha256.digest(new Uint8Array(await indexRes.arrayBuffer()))

      const res = await blockly.get(`${mhToString(blockMh)}/${mhToString(indexMh)}.idx`)
      assert(res, `missing index: ${mhToString(blockMh)}/${mhToString(indexMh)}.idx`)

      const reader = MultiIndexReader.createReader({ reader: res.body.getReader() })
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        // @ts-expect-error
        if (!equals(value.multihash.bytes, blockMh.bytes)) {
          // @ts-expect-error
          console.log(`  ${value.origin}: ${Link.create(raw.code, value.multihash).toString()} @ ${value.offset}`)
          // @ts-expect-error
          mhashes.push(value.multihash)
        }
      }
    }
  })
})
