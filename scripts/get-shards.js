import dotenv from 'dotenv'
import * as Link from 'multiformats/link'
import { notNully } from './util.js'
import { getShards } from './lib/dudewhere.js'

dotenv.config()

async function main () {
  const root = Link.parse(notNully(process.argv[2]))
  const shards = await getShards(root, {
    region: notNully(process.env.R2_REGION),
    endpoint: notNully(process.env.R2_ENDPOINT),
    credentials: {
      accessKeyId: notNully(process.env.R2_ACCESS_KEY_ID),
      secretAccessKey: notNully(process.env.R2_SECRET_ACCESS_KEY)
    },
    bucket: notNully(process.env.DUDEWHERE_BUCKET_NAME)
  })
  shards.forEach(s => console.log(s.toString()))
}

main()
