import { S3Client, ListObjectsCommand } from '@aws-sdk/client-s3'
import * as Link from 'multiformats/link'

/**
 * @param {import('multiformats').UnknownLink} root
 * @param {{ region: string, endpoint: string, credentials: { accessKeyId: string, secretAccessKey: string }, bucket: string }} config
 */
export async function getShards (root, config) {
  const client = new S3Client(config)

  const cmd = new ListObjectsCommand({
    Bucket: config.bucket,
    Prefix: `${root}/`
  })

  const res = await client.send(cmd)
  /** @type {import('cardex/api').CARLink[]} */
  const shards = res.Contents?.map(c => Link.parse(c.Key?.split('/')[1] ?? '')) ?? []
  if (!shards.length) {
    throw new Error(`no shards: ${root}`)
  }
  return shards
}
