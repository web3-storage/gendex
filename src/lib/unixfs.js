import { UnixFS } from 'ipfs-unixfs'

/** @param {Uint8Array} data */
export function getUnixFsMeta (data) {
  try {
    return { type: UnixFS.unmarshal(data).type }
  } catch {
    return {}
  }
}
