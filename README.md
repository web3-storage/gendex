# gendex

Cloudflare worker to generate SATNAV and DUDEWHERE indexes for a given root CID + CAR CID. The CAR CID should already exist in CARPARK.

## Usage

```
POST /bafyDAGRootCID/bagyCARCID
```

Example:

```sh
curl -X POST https://gendex.worker/bafybeiaaacig2p32zjre4gmd7yz7xqisbdoxd735ofgtl3x73mfjwueoga/bagbaieran34obphcmkgqeebmfeohpcnuqazvmahd7bondhwff2c3h5gv4kha
```
