import type { R2Bucket, ServiceWorkerGlobalScope } from '@cloudflare/workers-types'
import type { BlockDecoder } from 'multiformats/codecs/interface'
import type { MultihashDigest, MultihashHasher } from 'multiformats/hashes/interface'
import type { ToString } from 'multiformats/link'
import type { CARLink } from 'cardex/api'

export interface Env {
  GENDEX: ServiceWorkerGlobalScope
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

export type MultihashString = ToString<MultihashDigest, 'z'>
export type ShardCIDString = ToString<CARLink, 'b'>
export type Offset = number

export interface BlockIndex extends Map<MultihashString, Map<ShardCIDString, Offset>> {}
export interface ShardIndex extends Map<ShardCIDString, Map<MultihashString, Offset>> {}
