# Experimenting with the debug API of Geth

Run:

* `npm install`
* `./node_modules/.bin/mocha test/debugFunctions.js`
* start Geth with `--rpcapi "web3,eth,net,debug"`
* `./node_modules/.bin/truffle test test/riddled.js`

Tested with:

* Geth v1.7.2 with `--rpcapi "web3,eth,net,debug"` where the genesis contains `"byzantiumBlock": 1000000`
* Geth v1.7.2 with `--rpcapi "web3,eth,net,debug"` where the genesis contains `"byzantiumBlock": 0`
* TestRPC v6.0.3
* TestRPC v6.0.3 with `--blocktime 1`
* TestRPC v3.0.0 with fixed `"bip39": "2.3.0"`