import * as Link from 'multiformats/link'
import dotenv from 'dotenv'
import { notNully } from './util.js'
import { putBlocklyIndexes } from './lib/blockly.js'

dotenv.config()

async function main () {
  const endpoint = new URL(notNully(process.env.GENDEX_ENDPOINT))
  const root = Link.parse(process.argv[2])
  await putBlocklyIndexes(endpoint, root)
}

main()
