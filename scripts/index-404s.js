import dotenv from 'dotenv'
import * as Link from 'multiformats/link'
import { getRecent404s } from './lib/analytics.js'
import { notNully } from './util.js'
import { getSuperDAG } from './lib/super-dag.js'
import { putBlocklyIndexes } from './lib/blockly.js'
import { getShards } from './lib/dudewhere.js'

dotenv.config()

const INTERVAL = 30_000
const RECENT_404_LIMIT = 25

async function main () {
  const analyticsConfig = {
    host: notNully(process.env.ANALYTICS_HOST),
    zone: notNully(process.env.ANALYTICS_ZONE),
    token: notNully(process.env.ANALYTICS_TOKEN)
  }
  const superDAGConfig = {
    region: notNully(process.env.DYNAMO_REGION),
    credentials: {
      accessKeyId: notNully(process.env.DYNAMO_ACCESS_KEY_ID),
      secretAccessKey: notNully(process.env.DYNAMO_SECRET_ACCESS_KEY)
    },
    tableName: notNully(process.env.DYNAMO_TABLE)
  }
  const dudeWhereConfig = {
    region: notNully(process.env.R2_REGION),
    endpoint: notNully(process.env.R2_ENDPOINT),
    credentials: {
      accessKeyId: notNully(process.env.R2_ACCESS_KEY_ID),
      secretAccessKey: notNully(process.env.R2_SECRET_ACCESS_KEY)
    },
    bucket: notNully(process.env.DUDEWHERE_BUCKET_NAME)
  }
  const blocklyConfig = {
    endpoint: new URL(notNully(process.env.GENDEX_ENDPOINT))
  }

  const previouslyFailed = new Set()

  let since = new Date(Date.now() - INTERVAL)
  while (true) {
    const start = Date.now()
    const paths = await getRecent404s(since, analyticsConfig.host, analyticsConfig.zone, RECENT_404_LIMIT, { token: analyticsConfig.token })
    for (const { path, count } of paths) {
      console.log(`${count} requests to ${path} since ${since.toISOString()}`)
      let cid
      try {
        cid = Link.parse(path.split('/')[2])
      } catch (err) {
        console.warn(`failed to parse CID from path: ${path}`, err)
        continue
      }

      const root = await getSuperDAG(cid, superDAGConfig)
      if (!root) {
        console.warn(`Unable to determine super DAG root: ${cid}`)
        continue
      }
      console.log(`Super DAG for ${cid} is ${root}`)

      if (previouslyFailed.has(root.toString())) {
        console.log(`Skipping indexing for previously failed DAG: ${root}`)
        continue
      }

      let shards
      try {
        shards = await getShards(root, dudeWhereConfig)
      } catch (err) {
        console.warn(err)
        previouslyFailed.add(root.toString())
        continue
      }

      try {
        await putBlocklyIndexes(blocklyConfig.endpoint, shards)
      } catch (err) {
        console.warn(err)
        previouslyFailed.add(root.toString())
      }
    }

    const took = Date.now() - start
    since = new Date()
    if (took < INTERVAL) {
      console.log(`Sleeping for ${INTERVAL - took}ms`)
      await new Promise(resolve => setTimeout(resolve, INTERVAL - took))
    }
  }
}

main()
