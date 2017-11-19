# Experimenting with the debug API of Geth

Run:

* `npm install`
* `./node_modules/.bin/mocha test/debugFunctions.js`
* start Geth with `--rpcapi "web3,eth,net,debug"`
* `./node_modules/.bin/truffle test test/riddled.js`