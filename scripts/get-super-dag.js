import dotenv from 'dotenv'
import * as Link from 'multiformats/link'
import { notNully } from './util.js'
import { getSuperDAG } from './lib/super-dag.js'

dotenv.config()

async function main () {
  const cid = Link.parse(notNully(process.argv[2]))
  const root = await getSuperDAG(cid, {
    region: notNully(process.env.DYNAMO_REGION),
    credentials: {
      accessKeyId: notNully(process.env.DYNAMO_ACCESS_KEY_ID),
      secretAccessKey: notNully(process.env.DYNAMO_SECRET_ACCESS_KEY)
    },
    tableName: notNully(process.env.DYNAMO_TABLE)
  })
  if (!root) return console.error('Unable to determine super DAG root')
  console.log(root.toString())
}

main()
