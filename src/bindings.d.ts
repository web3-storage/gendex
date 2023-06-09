import type { R2Bucket } from '@cloudflare/workers-types'
import type { BlockDecoder } from 'multiformats/codecs/interface'
import type { MultihashHasher } from 'multiformats/hashes/interface'

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
