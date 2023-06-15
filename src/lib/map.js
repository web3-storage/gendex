/**
 * @template K
 * @template V
 * @param {Map<K, V>} map
 */
export function getAnyMapEntry (map) {
  const { done, value } = map.entries().next()
  if (done) throw new Error('empty map')
  return value
}
