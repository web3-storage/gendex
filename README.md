# gendex

<p>
  <a href="https://github.com/web3-storage/gendex/actions/workflows/release.yml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/web3-storage/gendex/test.yml?branch=main&style=for-the-badge" /></a>
  <a href="https://github.com/web3-storage/gendex/blob/main/LICENSE.md"><img alt="License: Apache-2.0 OR MIT" src="https://img.shields.io/badge/LICENSE-Apache--2.0%20OR%20MIT-yellow?style=for-the-badge" /></a>
</p>

Cloudflare worker to generate indexes for a given root CID. The CAR CID should already exist in CARPARK.

## Usage

* [`POST /shard/bafyDAGRootCID/bagyCARCID`](#post-shardbafydagrootcidbagycarcid)
* [`POST /blocks/bafyDAGRootCID`](#post-blocksbafydagrootcid)

### `POST /shard/bafyDAGRootCID/bagyCARCID`

Build a CAR index in SATNAV for `bagyCARCID` and add an entry in DUDEWHERE for the CAR for the root `bafyDAGRootCID`.

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
    },
    {
      "/": "bagbaierab3ic5b4p3aefgjli45y5horw3v4gyxp68esouu24jwyygs7ruwwa"
    },
    {
      "/": "bagbaierabwac6wv57zciccalsikvqplncmtqytncpjuwluiyseh7mpextzta"
    },
    {
      "/": "bagbaieradnc36yqvptgs4zplhdw7mqywqk5xm3q56xqqmlx3ympfgklfcy5a"
    },
    {
      "/": "bagbaierahfhak33iohbyordgczlvbojj4l3m3hdu4vv4cxdb3adfshsivl7a"
    },
    {
      "/": "bagbaieramzgtw6cfvv5qjcekyc4xeyukdrtz3imr5kq3tewm43vzc5om5u3q"
    },
    {
      "/": "bagbaieraqbq2yjaflcvo3yq5fhgk5xu5naatl5em3qse3qlzc5jw7gqcadcq"
    },
    {
      "/": "bagbaieraqj3vwyrjk64e6bc3azaecxdzjylsyi62wsg75shslf4olytdz3ca"
    },
    {
      "/": "bagbaierarrmfkdkgowpvipusv6jhuu6xqa6fbbkgdvt5cmj3qfaoxyq6jiaq"
    },
    {
      "/": "bagbaieraseeulzpdm66wzqqnghzy4ssz2zi4lpfhmmwdq7nnrqmbrxgelmrq"
    },
    {
      "/": "bagbaierat3zdh6erftgou5mhzthy6giibxgzumhpttyrcbqbcexs5yz46kya"
    },
    {
      "/": "bagbaierav6viirlexwlct3xqsdckcdksfcdbia5lnwhzkqhidmjeiawjhrra"
    },
    {
      "/": "bagbaieray4lfu3jm2ksd76d67er6t5tebvjmz7a53rna7noaeelvlvyitgga"
    },
    {
      "/": "bagbaierai3ot5krlbplbapqbym5immraobrcsqwz2v226i77dcxnxrfaazbq"
    }
  ],
  "root": {
    "/": "bafybeia7yvvioltmupfxvkcfef75htxqbyylpot5ddxuzla5zaokjyrvfu"
  }
}
```

### `POST /blocks/bafyDAGRootCID`

Build block indexes for `bafyDAGRootCID`.

Note: block indexes are keyed by base58btc multibase encoded multihash. They are [multi-index indexes](https://github.com/alanshaw/cardex#multi-index-index) that index the block _as well as_ it's links.

Example:

```sh
curl -X POST https://gendex.worker/blocks/bafybeifsspna7evg6wtxfluwbt36c3e4yapq6vze3vaut2izwl72ombxrm
```

It returns an ndjson response - the multihashes of the blocks for which indexes were created:

```json
{"multihash":"zQmNy1SPkEn8dee73fiT63gPNsJxjUZJGZsT2j6dGPtZ41D"}
{"multihash":"zQmQUPjhg9FZy4WDeWNryedLF5zE8fvh2TQaxQD9RKvoY8X"}
{"multihash":"zQmQqyE7qbLNoysg3QeNyTcHwoz6zTbgyGzw9kvRM5niqrH"}
{"multihash":"zQmQvCexSfUUVAzSS4yPMoQ3pGYoDVhHFTquy1A6Wf9f2pW"}
{"multihash":"zQmS1Nw6RUkBunpmvpsRtyWLmiDThWDb9t1tMYqU64PWaTr"}
{"multihash":"zQmTQw5a9wtfomFivQbrv1S8Q4aef2vKfzXQvoTiy3msNvB"}
{"multihash":"zQmTfhvF7haihPBib9sckGzsdmBFWNeWbzjVJBvmZCA77WH"}
{"multihash":"zQmVvnfkJxdKSUmtPzWyovhxN2XXAAjdrxvkdrPKC6LkPps"}
{"multihash":"zQmXc8cXMMx5bpWPkNYPZZPkLahWKohJpiX7dHy59NvH5SF"}
{"multihash":"zQmZdXtovGKQbsWp2FiXwimzyCbdoAgLS4wAkWh8QXpXrbD"}
{"multihash":"zQma55cuZomjSTBP8m9DyYUo1PVYHLxL38ffhSQjihR6tk9"}
{"multihash":"zQmaMk3JuGW2sDepNkdeycG6moX3x84qoK7dYnzheKUEUee"}
{"multihash":"zQmaWsY8hE5xRWX97FRYGMAB1jYmoe3ZgcCDf28TTtfoN5P"}
{"multihash":"zQmdMoNCxuyd4RiLFLdtMmUjGtGqU7kqqHfucRmPNm4PUJU"}
```

If an error occurs mid stream, an object with an `error: string` property is output.

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/gendex/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/gendex/blob/main/LICENSE.md)
