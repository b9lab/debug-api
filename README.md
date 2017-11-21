# Experimenting with the debug API of Geth

## Run:

* `npm install`
* `./node_modules/.bin/mocha test/debugFunctions.js`
* start Geth with `--rpcapi "web3,eth,net,debug"`
* `./node_modules/.bin/truffle test test/riddled.js`

## Tested with:

* Geth v1.7.2 with `--rpcapi "web3,eth,net,debug"` where the genesis contains `"byzantiumBlock": 1000000`
* Geth v1.7.2 with `--rpcapi "web3,eth,net,debug"` where the genesis contains `"byzantiumBlock": 0`
* TestRPC v6.0.3
* TestRPC v6.0.3 with `--blocktime 1`
* TestRPC v3.0.0 with fixed `"bip39": "2.3.0"`

## Functions tested

* error situations:
    * one function that calls `revert()`
    * one function that calls an invalid opcode
    * one function that makes an invalid jump
* non-error situations:
    * one function that returns a `bool`
    * one function that returns a `uint`
    * one function that returns a tuple `(uint, string)`

## What is tested

* error situations:
    * send a transaction to the function:
        * assert the error state, via receipt
        * assert the error state, via `debug_traceTransaction`
* non-error situations:
    * make a `.call` to the function:
        * assert the expected returned value
    * send a transaction to the function:
        * assert the expected returned value, via logs
        * assert the expected returned value, via `debug_traceTransaction`

Geth and TestRPC differ, current TestRPC and previous TestRPC differ too. This explains the conditional `.skip()` calls. Geth should be the authority as to the expected behaviour.
