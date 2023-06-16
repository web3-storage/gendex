/** @param {string} [str] */
export const notNully = str => {
  if (str == null) throw new Error('nully')
  return str
}
