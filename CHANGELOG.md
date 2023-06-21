# Changelog

## [2.1.0](https://github.com/web3-storage/gendex/compare/v2.0.0...v2.1.0) (2023-06-19)


### Features

* allow HEAD request to /block route ([2fc79a9](https://github.com/web3-storage/gendex/commit/2fc79a9a27ae16df399fc95b75ce7eb91ccf0069))


### Bug Fixes

* guarded unixfs decode for meta ([727d794](https://github.com/web3-storage/gendex/commit/727d7944e773200ac0e223675b2e0a6d185a550c))

## [2.0.0](https://github.com/web3-storage/gendex/compare/v1.3.0...v2.0.0) (2023-06-16)


### ⚠ BREAKING CHANGES

* switch to CID based API

### Features

* switch to CID based API ([1b54714](https://github.com/web3-storage/gendex/commit/1b54714dd63ba277aeba3dc177b648e0c4bf0a26))

## [1.3.0](https://github.com/web3-storage/gendex/compare/v1.2.4...v1.3.0) (2023-06-15)


### Features

* script to create indexes ([526f5c0](https://github.com/web3-storage/gendex/commit/526f5c0b6c4b525f451232b56aa46ea081166857))

## [1.2.4](https://github.com/web3-storage/gendex/compare/v1.2.3...v1.2.4) (2023-06-14)


### Bug Fixes

* always slice ([5caa48c](https://github.com/web3-storage/gendex/commit/5caa48c2b33eb2a10102825d603a9dfe224ed5c2))

## [1.2.3](https://github.com/web3-storage/gendex/compare/v1.2.2...v1.2.3) (2023-06-14)


### Bug Fixes

* reduce concurrency and max lru items to stay within mem ([e9fff11](https://github.com/web3-storage/gendex/commit/e9fff112ad5d0bfaa4c3b1b72926cb32ae77233f))

## [1.2.2](https://github.com/web3-storage/gendex/compare/v1.2.1...v1.2.2) (2023-06-14)


### Bug Fixes

* log index writer error ([44c4b4c](https://github.com/web3-storage/gendex/commit/44c4b4c324c269398150fafb684dd148b54a4e8b))

## [1.2.1](https://github.com/web3-storage/gendex/compare/v1.2.0...v1.2.1) (2023-06-14)


### Bug Fixes

* remove verbose logs ([0efcbef](https://github.com/web3-storage/gendex/commit/0efcbef7391e4274119937e20aff9cd3dbab9403))

## [1.2.0](https://github.com/web3-storage/gendex/compare/v1.1.0...v1.2.0) (2023-06-14)


### Features

* add LRU cache ([14b32af](https://github.com/web3-storage/gendex/commit/14b32af06139b78851b63f2293e0f8bac5eb8f28))

## [1.1.0](https://github.com/web3-storage/gendex/compare/v1.0.0...v1.1.0) (2023-06-14)


### Features

* batching blockstore ([1183c16](https://github.com/web3-storage/gendex/commit/1183c16e872f722a20787023826d7198bcc14336))

## 1.0.0 (2023-06-14)


### Features

* block indexing ([2913167](https://github.com/web3-storage/gendex/commit/2913167954c6b25b877b931bab120521c32dde56))
* initial commit ([a5ca4e1](https://github.com/web3-storage/gendex/commit/a5ca4e1d90b0008b802336de50b818bd3eccb627))
* switch to streaming ndjson response for blocks indexes ([db65db6](https://github.com/web3-storage/gendex/commit/db65db6ee7bb4ea5f83c6ce7fba2ffd73e89f412))


### Bug Fixes

* em ups ([24a3542](https://github.com/web3-storage/gendex/commit/24a35422b99e61583aa76fd53e859b66210b28d9))
* ensure v1 root CID ([8083823](https://github.com/web3-storage/gendex/commit/8083823253e23dbb85037d95223828f550f1354b))
* put blob does not work ([c4ec678](https://github.com/web3-storage/gendex/commit/c4ec678f3b9f29390fb0c5ace21306df09493345))
* r2 needs known content length ([db1c9f0](https://github.com/web3-storage/gendex/commit/db1c9f0ed520451c7d9ec45f6701086d3450c21e))
* use raw CID when accessing index data ([9470c21](https://github.com/web3-storage/gendex/commit/9470c21903bf4fc6643e7163a83e398dc0e1724d))
* use same CIDs in request as response ([5a697cd](https://github.com/web3-storage/gendex/commit/5a697cd0c76ec053545a13354ea552fac49097ed))
* use stream ([67962d5](https://github.com/web3-storage/gendex/commit/67962d5ce42395d02cd5783a1bdbacfcc626d9bc))
