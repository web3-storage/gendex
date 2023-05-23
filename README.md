# gendex

Cloudflare worker to generate SATNAV and DUDEWHERE indexes for a given root CID + CAR CID. The CAR CID should already exist in CARPARK.

## Usage

```
POST /bafyDAGRootCID/bagyCARCID
```

Example:

```sh
curl -X POST https://gendex.worker/bafybeia7yvvioltmupfxvkcfef75htxqbyylpot5ddxuzla5zaokjyrvfu/bagbaierai3ot5krlbplbapqbym5immraoercsqwz2v226i77dcxnxrfaazbq
```

Note: if a DAG exists in multiple CARs, you'll need to send multiple requests with the same root CID for each CAR CID.

Response:

```json
{
  "car": {
    "/": "bagbaierai3ot5krlbplbapqbym5immraoercsqwz2v226i77dcxnxrfaazbq"
  },
  "car_size": 980242,
  "index_size": 110,
  "origin_cars": [
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
