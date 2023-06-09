/**
 * @param {import('@cloudflare/workers-types').R2Bucket} bucket
 * @param {string} prefix
 */
export async function listAll (bucket, prefix) {
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
