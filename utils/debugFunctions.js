"use strict";

module.exports = function(web3) {
    web3.debug = web3.debug ? web3.debug : {};

    if (typeof web3.debug.memStats === "undefined") {
        /**
         * @param {!function} callback - Node-type callback: error, result.
         */
        web3.debug.memStats = function(callback) {
            web3.currentProvider.sendAsync(
                {
                    jsonrpc: "2.0",
                    method: "debug_memStats",
                    params: [],
                    id: new Date().getTime()
                },
                (error, result) => {
                    callback(error, error ? result : result.result);
                });
        };
    }

    if (typeof web3.debug.traceTransaction === "undefined") {
        /**
         * @param {!string} txHash. The hash of the transaction to trace.
         * @param {!function} callback - Node-type callback: error, object with trace.
         */
        web3.debug.traceTransaction = function(txHash, callback) {
            web3.currentProvider.sendAsync(
                {
                    jsonrpc: "2.0",
                    method: "debug_traceTransaction",
                    params: [ txHash ],
                    id: new Date().getTime()
                },
                (error, result) => {
                    callback(error, error ? result : result.result);
                });
        };
    }
};