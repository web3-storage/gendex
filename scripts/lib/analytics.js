import retry from 'p-retry'

const endpoint = 'https://api.cloudflare.com/client/v4/graphql'

/**
 * @param {string} zone
 * @param {string} host
 * @param {Date} since
 * @param {number} [limit]
 */
const query = (since, host, zone, limit) => `
query GetZoneTopNs {
  viewer {
    zones(filter: {zoneTag: "${zone}"}) {      
      topPaths: httpRequestsAdaptiveGroups(filter: { AND: [{ datetime_geq: "${since.toISOString()}" }, { clientRequestHTTPHost: "${host}" }, { edgeResponseStatus: 404 }, { requestSource: "eyeball" }] }, limit: ${limit ?? 100}, orderBy: [count_DESC]) {        
        count
        dimensions {
          metric: clientRequestPath
        }
      }
    }
  }
}
`

/**
 * @param {Date} since
 * @param {string} host
 * @param {string} zone
 * @param {number} limit
 * @param {{ token: string }} config
 */
export async function getRecent404s (since, host, zone, limit, config) {
  return retry(async () => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${config.token}`
      },
      body: JSON.stringify({ query: query(since, host, zone, limit) })
    })
    if (!res.ok) throw new Error(`failed to get recent 404s: ${res.status}`)
    const { data, errors } = await res.json()
    if (errors && errors.length) throw new Error('failed to get recent 404s', { cause: errors })
    return data.viewer.zones[0].topPaths.map(({ dimensions, count }) => ({ path: dimensions.metric, count }))
  })
}
