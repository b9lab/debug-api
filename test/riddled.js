"use strict";

const Promise = require('bluebird');

const Riddled = artifacts.require("./Riddled.sol");
const addDebugFunctions = require("../utils/debugFunctions.js");

addDebugFunctions(web3);

if (typeof web3.debug.traceTransactionPromise !== "function") {
    Promise.promisifyAll(web3.debug, { suffix: "Promise" });
}
if (typeof web3.eth.getBlockPromise !== "function") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}
if (typeof web3.version.getNodePromise !== "function") {
    Promise.promisifyAll(web3.version, { suffix: "Promise" });
}
web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
web3.eth.makeSureAreUnlocked = require("../utils/makeSureAreUnlocked.js");
web3.eth.makeSureHasAtLeast = require("../utils/makeSureHasAtLeast.js");

contract('Riddled', function(accounts) {

    // PREPARATION
    const MAX_GAS = 3000000;
    let owner, isTestRPC, isGeth, hasDebug, instance;

    before("should prepare accounts", function() {
        assert.isAtLeast(accounts.length, 1, "should have at least 1 account");
        owner = accounts[ 0 ];
        return web3.eth.makeSureAreUnlocked([ owner ])
            .then(() => web3.eth.makeSureHasAtLeast(
                owner, [ owner ], web3.toWei(2)))
            .then(txObject => web3.eth.getTransactionReceiptMined(txObject));
    });

    before("should identify node", function() {
        return web3.version.getNodePromise()
            .then(node => {
                isTestRPC = node.indexOf("EthereumJS TestRPC") >= 0;
                isGeth =  node.indexOf("Geth") >= 0;
                if (!isTestRPC && !isGeth) {
                    throw new Error("Unknown behaviour for node " + node);
                }
            });
    });

    before("should identify debug API", function() {
        return web3.debug.memStatsPromise()
            .then(memStats => hasDebug = typeof memStats === "object");
    });

    beforeEach("should deploy a Riddled", function() {
        return Riddled.new({ from: owner })
            .then(_instance => instance = _instance);
    });

    describe("doRevert()", function() {
        it("should have failed in receipt", function() {
            return instance.doRevert({ from: owner, gas: MAX_GAS })
                .then(
                    txObject => {
                        if (typeof txObject.receipt.status !== "undefined") {
                            // Post Byzantium
                            assert.equal(txObject.receipt.status, 0);
                            assert.isBelow(txObject.receipt.gasUsed, MAX_GAS);
                        } else {
                            // Pre Byzantium
                            assert.equal(txObject.receipt.gasUsed, MAX_GAS);
                        }
                    },
                    e => {
                        assert.isTrue(isTestRPC);
                        const isRevert = 0 <= e.toString().indexOf("revert"); // Post Byzantium
                        const isInvalid = 0 <= e.toString().indexOf("invalid opcode"); // Pre Byzantium
                        assert.isTrue(
                            isRevert || isInvalid,
                            "isRevert: " + isRevert + ", isInvalid: " + isInvalid);
                    }
                );
        });

        it("should have failed in trace", function() {
            if (!hasDebug) this.skip("Needs debug API");
            return instance.doRevert({ from: owner, gas: MAX_GAS })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => {
                    assert.strictEqual(trace.returnValue, "");
                    const lastStep = trace.structLogs[trace.structLogs.length - 1];
                    assert.strictEqual(lastStep.op, "REVERT");
                });
        });
    });

    describe("doInvalid()", function() {
        it("should have failed in receipt", function() {
            return instance.doInvalid({ from: owner, gas: MAX_GAS })
                .then(
                    txObject => {
                        // Always consumes all
                        assert.equal(txObject.receipt.gasUsed, MAX_GAS);
                        if (typeof txObject.receipt.status !== "undefined") {
                            // Post Byzantium
                            assert.equal(txObject.receipt.status, 0);
                        }
                    },
                    e => {
                        assert.isTrue(isTestRPC);
                        assert.isAtLeast(e.toString().indexOf("invalid opcode"), 0);
                    }
                );
        });

        it("should have failed in trace", function() {
            if (!hasDebug) this.skip("Needs debug API");
            return instance.doInvalid({ from: owner, gas: MAX_GAS })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => {
                    assert.strictEqual(trace.returnValue, "");
                    const lastStep = trace.structLogs[trace.structLogs.length - 1];
                    assert.strictEqual(lastStep.op, "Missing opcode 0xfe");
                });
        });
    });

    describe("doBadJump()", function() {
        it("should have failed in receipt", function() {
            return instance.doBadJump({ from: owner, gas: MAX_GAS })
                .then(
                    txObject => {
                        // Always consumes all
                        assert.equal(txObject.receipt.gasUsed, MAX_GAS);
                        if (typeof txObject.receipt.status !== "undefined") {
                            // Post Byzantium
                            assert.equal(txObject.receipt.status, 0);
                        }
                    },
                    e => {
                        assert.isTrue(isTestRPC);
                        assert.isAtLeast(e.toString().indexOf("invalid JUMP at"), 0);
                    }
                );
        });

        it("should have failed in trace", function() {
            if (!hasDebug) this.skip("Needs debug API");
            return instance.doBadJump({ from: owner, gas: MAX_GAS })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => {
                    assert.strictEqual(trace.returnValue, "");
                    const lastStep = trace.structLogs[trace.structLogs.length - 1];
                    assert.strictEqual(lastStep.op, "JUMP");
                });
        });
    });

});