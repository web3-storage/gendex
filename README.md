# gendex

<p>
  <a href="https://github.com/web3-storage/gendex/actions/workflows/release.yml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/web3-storage/gendex/test.yml?branch=main&style=for-the-badge" /></a>
  <a href="https://github.com/web3-storage/gendex/blob/main/LICENSE.md"><img alt="License: Apache-2.0 OR MIT" src="https://img.shields.io/badge/LICENSE-Apache--2.0%20OR%20MIT-yellow?style=for-the-badge" /></a>
</p>

Cloudflare worker to generate indexes for a given root CID. The CAR CID should already exist in CARPARK.

## Usage

* [`POST /shard/:root-cid/:car-cid`](#post-shardroot-cidcar-cid) - Build a CAR index.
* [`POST /indexes`](#post-indexes) - Get blockly index data for blocks in the passed CAR shards.
* [`PUT /block/:cid`](#put-blockcid) - Put a block index.

### `POST /shard/:root-cid/:car-cid`

Build a CAR index in SATNAV for `:car-cid` and add an entry in DUDEWHERE for the CAR for the root `:root-cid`.

Example:

```sh
curl -X POST https://gendex.worker/shard/bafybeia7yvvioltmupfxvkcfef75htxqbyylpot5ddxuzla5zaokjyrvfu/bagbaierai3ot5krlbplbapqbym5immraoercsqwz2v226i77dcxnxrfaazbq
```

Note: if a DAG exists in multiple CARs, you'll need to send multiple requests with the same root CID for each CAR CID.

Response:

```json
{
  "shard": {
    "/": "bagbaierai3ot5krlbplbapqbym5immraoercsqwz2v226i77dcxnxrfaazbq"
  },
  "shard_size": 980242,
  "index_size": 110,
  "shards": [
    {
      "/": "bagbaiera5etmvuesawkbpt7wdcrahsy43rr7mpux5iki2asggb4ps27ovyta"
    },
    {
      "/": "bagbaiera5rsd3yrhibnsmmeq4vertwiguu5prjpj54kvpo3turtxdm2mpp3q"
    },
    {
      "/": "bagbaiera6awehe5enzflfj3dssk3g7pv6xwawcxlglbn5muveo6lu7fb2yrq"
    }
  ],
  "root": {
    "/": "bafybeia7yvvioltmupfxvkcfef75htxqbyylpot5ddxuzla5zaokjyrvfu"
  }
}
```

### `POST /indexes`

Get blockly indexes for the blocks in the passed CAR shards in the request body.

Example:

```sh
curl -X POST https://gendex.worker/index
# TODO: example needs body data
```

Returns an nddagjson response:

```js
{
  shard: CID(bagbaieradoadc65goax2aehjn73oevbx6cbxjl5xp7k4vii24635mxkki42q)
  block: CID(bafybeifsspna7evg6wtxfluwbt36c3e4yapq6vze3vaut2izwl72ombxrm),
  offset: 862398,
  length: 831,
  links: [
    {
      shard: CID(bagbaieradoadc65goax2aehjn73oevbx6cbxjl5xp7k4vii24635mxkki42q),
      block: CID(bafkreibwp3p5adaxnk2y5ecqliqq3sqmwe66j2cxcmykn3tnxewdc47hie),
      offset: 21,
      length: 60033
    },
    {
      shard: CID(bagbaieradoadc65goax2aehjn73oevbx6cbxjl5xp7k4vii24635mxkki42q),
      block: CID(bafkreidqychd3wyw4rixs2avqdkvlp6q7is4w3c6q2ef5h4hx77rkmm6xa),
      offset: 60057,
      length: 54154
    },
    {
      shard: CID(bagbaieradoadc65goax2aehjn73oevbx6cbxjl5xp7k4vii24635mxkki42q),
      block: CID(bafkreicpfqmunngoi5vixmfhbngefx5sdpo4tqbtbbdxdrgyuosohbki3i),
      offset: 114214,
      length: 45056
    }
  ]
}
```

### `PUT /block/:cid`

Put a block index for `:cid`.

The request body should be a [multi-index index](https://github.com/alanshaw/cardex#multi-index-index) with the index information for the block AND it's links.

The index is written to `<base58(block-multihash)>/<base58(index-multihash)>.idx`

Note: block indexes are keyed by base58btc multibase encoded multihash. They are [multi-index indexes](https://github.com/alanshaw/cardex#multi-index-index) that index the block _as well as_ it's links.

A "symlink" is written to `<base58(block-multihash)>/.idx`. The file contains the multihash of an index for the block.

Example:

```sh
curl -X PUT https://gendex.worker/block/bafybeifvf4imqksp7d5tkbf6hsxx7bg5kexbpdojfrl7ibrpi3mzaws3b4
# TODO: example needs body data
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/gendex/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/gendex/blob/main/LICENSE.md)
