# gendex

<p>
  <a href="https://github.com/web3-storage/gendex/actions/workflows/release.yml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/web3-storage/gendex/test.yml?branch=main&style=for-the-badge" /></a>
  <a href="https://github.com/web3-storage/gendex/blob/main/LICENSE.md"><img alt="License: Apache-2.0 OR MIT" src="https://img.shields.io/badge/LICENSE-Apache--2.0%20OR%20MIT-yellow?style=for-the-badge" /></a>
</p>

Cloudflare worker to generate indexes for a given root CID. The CAR CID should already exist in CARPARK.

## Usage

* [`POST /shard/:root-cid/:car-cid`](#post-shardrootcidcarcid)
* [`POST /links/:cid`](#post-linkscid)
* [`HEAD /block/:cid`](#head-blockcid)
* [`PUT /block/:cid`](#put-blockcid)
* [`GET /index/:cid`](#get-indexcid)

### `POST /shard/:root-cid/:car-cid`

Build a CAR index in SATNAV for `:car-cid` and add an entry in DUDEWHERE for the CAR for the root `:root-cid`.

Example:

```sh
curl -X POST https://gendex.worker/shard/bafybeia7yvvioltmupfxvkcfef75htxqbyylpot5ddxuzla5zaokjyrvfu/bagbaierai3ot5krlbplbapqbym5immraoercsqwz2v226i77dcxnxrfaazbq
```

Note: if a DAG exists in multiple CARs, you"ll need to send multiple requests with the same root CID for each CAR CID.

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

### `POST /links/:cid`

Obtain CIDs for links of `:cid`.

Example:

```sh
curl -X POST https://gendex.worker/links/bafybeifvf4imqksp7d5tkbf6hsxx7bg5kexbpdojfrl7ibrpi3mzaws3b4
```

Response:

```json
{
  "cid": {
    "/": "bafybeifvf4imqksp7d5tkbf6hsxx7bg5kexbpdojfrl7ibrpi3mzaws3b4"
  },
  "links": [
    {
      "/": "bafkreiaujy7eipaqouojrzg44gxzmclhip7wdx4jcdlc2gjkxex3qmtuoe"
    },
    {
      "/": "bafkreihhvnnlp6bnnfnh7todbiovk5e2x2qdk3xl4lldlkwbspmjnzkxj4"
    },
    {
      "/": "bafkreicppa4bymzulkqm5b5xnru67y5e6osv2rmnqef3ncyolw7i6cm4f4"
    }
  ],
  "meta": { "type": "file" }
}
```

### `HEAD /block/:cid`

Determine if a block index exists already for a given CID. Returns 404 status if not exists and 200 otherwise.

Example:

```sh
curl -X HEAD https://gendex.worker/block/bafybeifvf4imqksp7d5tkbf6hsxx7bg5kexbpdojfrl7ibrpi3mzaws3b4
```

### `PUT /block/:cid`

Put a block index for `:cid`.

The request body should be a [multi-index index](https://github.com/alanshaw/cardex#multi-index-index) with the index information for the block AND it's links.

Note: block indexes are keyed by base58btc multibase encoded multihash. They are [multi-index indexes](https://github.com/alanshaw/cardex#multi-index-index) that index the block _as well as_ it's links.

Example:

```sh
curl -X PUT https://gendex.worker/block/bafybeifvf4imqksp7d5tkbf6hsxx7bg5kexbpdojfrl7ibrpi3mzaws3b4
# TODO: example needs body data
```

It returns an ndjson response, a list of blocks the block links to and the CIDs of _their_ links. The last item output is always the indexed block itself.

```json
{
  "cid": {
    "/": "bafybeifvf4imqksp7d5tkbf6hsxx7bg5kexbpdojfrl7ibrpi3mzaws3b4"
  },
  "links": [
    {
      "/": "bafkreiaujy7eipaqouojrzg44gxzmclhip7wdx4jcdlc2gjkxex3qmtuoe"
    },
    {
      "/": "bafkreihhvnnlp6bnnfnh7todbiovk5e2x2qdk3xl4lldlkwbspmjnzkxj4"
    },
    {
      "/": "bafkreicppa4bymzulkqm5b5xnru67y5e6osv2rmnqef3ncyolw7i6cm4f4"
    }
  ],
  "meta": { "type": "file" }
}
\n
// ...
```

If an error occurs mid stream, an object with an `error: string` property is output.

### `GET /index/:cid`

Get a [multi-index index](https://github.com/alanshaw/cardex#multi-index-index) containing block CAR and offset information for the entire DAG routed at `:cid`.

Example:

```sh
curl https://gendex.worker/index/bafybeifvf4imqksp7d5tkbf6hsxx7bg5kexbpdojfrl7ibrpi3mzaws3b4
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/gendex/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/gendex/blob/main/LICENSE.md)
