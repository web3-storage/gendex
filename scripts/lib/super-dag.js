import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { base58btc } from 'multiformats/bases/base58'
import * as Link from 'multiformats/link'

/**
 * @param {import('multiformats/link').UnknownLink} root
 * @param {{ region: string, credentials: { accessKeyId: string, secretAccessKey: string }, tableName: string }} config
 */
export async function getSuperDAG (root, config) {
  const client = new DynamoDBClient(config)
  const tableName = config.tableName

  const command = new QueryCommand({
    TableName: tableName,
    Limit: 100,
    KeyConditions: {
      blockmultihash: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [{ S: base58btc.encode(root.multihash.bytes) }]
      }
    },
    AttributesToGet: ['carpath']
  })

  const res = await client.send(command)

  const items = (res.Items ?? []).map(item => {
    const { carpath } = unmarshall(item)
    const [region, bucket, ...rest] = carpath.split('/')
    return { region, bucket, key: rest.join('/') }
  })

  const item = items.find(({ key }) => key.startsWith('raw'))
  if (!item) return

  return Link.parse(item.key.split('/')[1])
}
