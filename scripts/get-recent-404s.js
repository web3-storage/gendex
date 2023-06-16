import dotenv from 'dotenv'
import { notNully } from './util.js'
import { getRecent404s } from './lib/analytics.js'

dotenv.config()

const FIFTEEN_MINUTES = 1000 * 60 * 15
const LIMIT = 5

async function main () {
  const since = new Date(Date.now() - FIFTEEN_MINUTES)
  const host = notNully(process.env.ANALYTICS_HOST)
  const zone = notNully(process.env.ANALYTICS_ZONE)
  const paths = await getRecent404s(since, host, zone, LIMIT, { token: notNully(process.env.ANALYTICS_TOKEN) })
  console.log(paths)
}

main()
