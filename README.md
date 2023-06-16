# gendex

<p>
  <a href="https://github.com/web3-storage/gendex/actions/workflows/release.yml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/web3-storage/gendex/test.yml?branch=main&style=for-the-badge" /></a>
  <a href="https://github.com/web3-storage/gendex/blob/main/LICENSE.md"><img alt="License: Apache-2.0 OR MIT" src="https://img.shields.io/badge/LICENSE-Apache--2.0%20OR%20MIT-yellow?style=for-the-badge" /></a>
</p>

Cloudflare worker to generate indexes for a given root CID. The CAR CID should already exist in CARPARK.

## Usage

* [`POST /shard/bafyDAGRootCID/bagyCARCID`](#post-shardbafydagrootcidbagycarcid)
* [`POST /block/bafyBlockCID`](#post-blockbafyblockcid)
* [`POST /links/bafyBlockCID`](#post-linksbafyblockcid)
* [`GET /index/bafyDAGRootCID`](#get-indexbafydagrootcid)

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

### `POST /block/bafyBlockCID`

Build block index for `bafyBlockCID`.

The request body should be a [multi-index index](https://github.com/alanshaw/cardex#multi-index-index) with the index information for the block AND it's links.

Note: block indexes are keyed by base58btc multibase encoded multihash. They are [multi-index indexes](https://github.com/alanshaw/cardex#multi-index-index) that index the block _as well as_ it's links.

Example:

```sh
curl -X POST https://gendex.worker/block/zQmdMoNCxuyd4RiLFLdtMmUjGtGqU7kqqHfucRmPNm4PUJU
```

It returns an ndjson response, a list of blocks the block links to and the multihashes of _their_ links. The last item output is always the indexed block itself.

```json
{
  "multihash": "zQmaXv8NLDFUV3roNYBAsvTihgpHCPSDUdLGnBnV8DibrJr",
  "links": [
    "zQmPhv4ZVqUaqnPpNXQankK235Khwhs5KmSswtWxVg5i4it",
    "zQmdvzS9Z6rb3NE6gG6hKPKi1EerQsQF16MmRQVDCCFQm9x",
    "zQmTgsEszfX6PxKpbgvNyhzPY1EWWzQxoDy2Qvzhp4xATEW",
    "zQmdj6kU59VYJMdpdJokwyFJ9z8yrEqE41dF15y3VnWbRR8",
    "zQmV1vqa2SKPA3q9rWcEuSULYigC9r2ZF7Gt28TfVNBTPFM",
    "zQmTzxphhupYmvWMHaJrEJfTmnUNx9KFGzz2XkQMnhsA9n1",
    "zQmcuYSwqjsL7FiiQvymVAk4x8ot65h2ZRZ6UY9PRwpi2tc",
    "zQmba71bwAPzcjSQQErVqXXw5oAy2BHLgbrg3Bdx7sMwT8r",
    "zQmdWJtBkiX5rLG2UnhmS9EGbNNjyZZkY1eQL4m7tvnzaVi",
    "zQmdnMe7Kcu7wjN2LscmYJXS3ovkkRZ61WiqptcxUYJcJsH",
    "zQmf9AVv98df1yN1L1NcSDgqSAxEFqJQiJsy65HeENWLvyb",
    "zQmPyVJDj5Xx54oKdyQoPo1cgciHvecBYRV3mMJv8fherw7",
    "zQmZww1aYxYk4W3TDrtrbXqVpwYqsnbh8ufKwgDXowKDNTE",
    "zQmQmbnK86RkmwTUxLmboZLbaL4SRSfy6PNFcWifxM4v7zE",
    "zQmT44XBoR8rUHfKGF6Q1iEWLX1FpS2VAaH6Hemwrk4XsgL",
    "zQmNSsNa2AdPc39mfGvmTu5KKL9yTsCWuFwzB43tzCtGhAe",
    "zQmWrPmwC7TmdWjN6252d7XaZjn82fJvHehzdNWJbVm9kC8",
    "zQmNczf3oWcDPzCMdkDD1o4YnTx3o7cpkz7LWBx2ejAGFQQ",
    "zQmYTJ8zsHvGmM1TCXW7h8bss2fXK15GqqohtUgfQNpjcmP",
    "zQmUQuVCqnj281U42ges6zNGQBov4VuUTf4q63CFNMY8cbv",
    "zQmXSgWgTZBCZjirFF2MraZGpnVyqP82Q8v9Rz3DgVLYFKp",
    "zQmcKnC16JfEK7ZFBGa4wCr9sDKR2Qheyha3FdMT43XNH6R",
    "zQmNSP4q8evhaXytQoLbSH3qw7i3j6ZxwUnwBKM2oRnKoYN",
    "zQmZUaRQzkWuF18SaAqR3fxKGYfQrhyReFRdu6BuN7wXy3u",
    "zQmSh44TggA2FEXv894WiNaWyNCDQQroz6sQLmFD6tDrksh",
    "zQmPNHsUXwGxUgUsgP34SL7X8PRinsWSwRboUbcQjfZHTSW",
    "zQmWo4J7GLiFiekNtvqBNtB7q2zPkM2miXZHkYkMvZ5uhVE",
    "zQmWbaE8X6mGjL7QfPV2kbBCZBrUnzzHupcBCZMthfPqhSy",
    "zQmeaf7na2PrtDtgmHvUSMHgjjNpwxoAbTk8cy45WhsjSKF",
    "zQmbiZVJFG2bWxWsSNnP1XrbFHnMzR9D9biZuyrTs8LGDid",
    "zQmda6RQ7GcdgJoVsPzDToCMvdEFGjd8d5bMckGG8ykzrwD",
    "zQmRC6eVvWWPpAxjJW9J4JvVbdJw6mFywquJogKWpRUrizZ",
    "zQmW2sGYHM2AwXh7G8gFbA6y3wct65a5vKuxzg9ZniJga8S"
  ]
}
```

If an error occurs mid stream, an object with an `error: string` property is output.

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/gendex/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/gendex/blob/main/LICENSE.md)
