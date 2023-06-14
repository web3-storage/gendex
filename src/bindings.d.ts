import type { R2Bucket } from '@cloudflare/workers-types'
import type { BlockDecoder } from 'multiformats/codecs/interface'
import type { MultihashHasher } from 'multiformats/hashes/interface'
import type { CARLink } from 'cardex/api'

export interface Env {
  CARPARK: R2Bucket
  SATNAV: R2Bucket
  DUDEWHERE: R2Bucket
  BLOCKLY: R2Bucket
}

export interface BlockDecoders {
  [code: number]: BlockDecoder<any, any>
}

export interface MultihashHashers {
  [code: number]: MultihashHasher<any>
}

export interface IndexSource {
  /** Bucket this index can be found in */
  bucket: R2Bucket
  /** Bucket key for the source */
  key: string
  /** Origin CAR CID the index source applies to. */
  origin: CARLink
}
