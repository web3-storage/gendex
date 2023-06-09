# gendex

<p>
  <a href="https://github.com/web3-storage/gendex/actions/workflows/release.yml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/web3-storage/gendex/test.yml?branch=main&style=for-the-badge" /></a>
  <a href="https://github.com/web3-storage/gendex/blob/main/LICENSE.md"><img alt="License: Apache-2.0 OR MIT" src="https://img.shields.io/badge/LICENSE-Apache--2.0%20OR%20MIT-yellow?style=for-the-badge" /></a>
</p>

Cloudflare worker to generate indexes for a given root CID. The CAR CID should already exist in CARPARK.

## Usage

* [`POST /shard/bafyDAGRootCID/bagyCARCID`](#post--car-bafyDAGRootCID-bagyCARCID)
* [`POST /blocks/bafyDAGRootCID`](#post--blocks-bafyDAGRootCID)

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

Note: block indexes are keyed by _raw_ CID. They are [multi-index indexes](https://github.com/alanshaw/cardex#multi-index-index) that index the block _as well as_ it's links.

Example:

```sh
curl -X POST https://gendex.worker/blocks/bafybeifsspna7evg6wtxfluwbt36c3e4yapq6vze3vaut2izwl72ombxrm
```

Response:

```json
{
  "blocks": [
    {
      "/": "bafkreiajkbmpugz75eg2tmocmp3e33sg5kuyq2amzngslahgn6ltmqxxfa"
    },
    {
      "/": "bafkreia7wmluhebzfayp66yxdkaz5rp57pezn4ffksdth6qt6f2cl67f2a"
    },
    {
      "/": "bafkreibfhit3emjewk2rzlibpxb6wiufz42pq2atofaa2eo3anqwfxvaui"
    },
    {
      "/": "bafkreibgj6uwfebncr524o5djgt5ibx2lru4gns3lsoy7fy5ds35zrvk24"
    },
    {
      "/": "bafkreibwp3p5adaxnk2y5ecqliqq3sqmwe66j2cxcmykn3tnxewdc47hie"
    },
    {
      "/": "bafkreiclmncicyhuvouq4uy7m5522kzopgveu4nifsypsyzpols4sr5eka"
    },
    {
      "/": "bafkreicpfqmunngoi5vixmfhbngefx5sdpo4tqbtbbdxdrgyuosohbki3i"
    },
    {
      "/": "bafkreidqychd3wyw4rixs2avqdkvlp6q7is4w3c6q2ef5h4hx77rkmm6xa"
    },
    {
      "/": "bafkreiejwbzaebwz36nbxndyjxmlxbngkj273wgbywzhquybxgkm5julha"
    },
    {
      "/": "bafkreifhyo4ufquwtoslssrq33xd2oqf3efhsd4zhux4q2tnoibn7ghsiq"
    },
    {
      "/": "bafkreifoj4o4ymxkgzsg7oxi2ygqzesbeym6dek6v4ilfpobtmtpq5hppi"
    },
    {
      "/": "bafkreifsspna7evg6wtxfluwbt36c3e4yapq6vze3vaut2izwl72ombxrm"
    },
    {
      "/": "bafkreifu5khfcsowea5arl2cdyafww6phowqpii3gqhcxsw7h2hysmqd4i"
    },
    {
      "/": "bafkreig7fkwfagyrm2ahj56pemkrt5dhso4njmwne7dxizear4777apxee"
    }
  ],
  "root": {
    "/": "bafybeifsspna7evg6wtxfluwbt36c3e4yapq6vze3vaut2izwl72ombxrm"
  },
  "shards": [
    {
      "/": "bagbaieradoadc65goax2aehjn73oevbx6cbxjl5xp7k4vii24635mxkki42q"
    }
  ]
}
```
## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/gendex/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/gendex/blob/main/LICENSE.md)
