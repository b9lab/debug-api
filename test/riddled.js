"use strict";

const Promise = require('bluebird');

const Riddled = artifacts.require("./Riddled.sol");
const addDebugFunctions = require("../utils/debugFunctions.js");
const SolidityFunctions = require("web3/lib/web3/function.js");

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

    before("should identify debug traceTransaction", function() {
        return web3.eth.sendTransactionPromise({ from: owner, to: owner })
            .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
            .then(receipt => web3.debug.traceTransactionPromise(receipt.transactionHash))
            .then(
                trace => hasDebug = typeof trace === "object"
                    && typeof trace.returnValue !== "undefined",
                e => { console.log(e); throw e; }
            );
    });

    const createRiddledSolidityFunction = funcName => new SolidityFunctions(
        web3.eth,
        Riddled.abi.find(func => func.name == funcName),
        instance.address);

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
                        const isRevert = 0 <= e.toString().indexOf("revert"); // Post EIP 140
                        const isInvalid = 0 <= e.toString().indexOf("invalid opcode"); // Pre EIP 140
                        assert.isTrue(
                            isRevert || isInvalid,
                            "isRevert: " + isRevert + ", isInvalid: " + isInvalid);
                    }
                );
        });

        it("should have failed in trace", function() {
            if (!hasDebug) this.skip("Needs debug API");
            const self = this;
            return instance.doRevert({ from: owner, gas: MAX_GAS })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(
                    trace => {
                        assert.isTrue(trace.failed || isTestRPC); // TestRPC does not populate this field
                        assert.strictEqual(trace.returnValue, "");
                        const lastStep = trace.structLogs[trace.structLogs.length - 1];
                        assert.strictEqual(lastStep.op, "REVERT");
                    },
                    e => {
                        if (isTestRPC && e.toString().indexOf("revert") >= 0) {
                            self.skip("TestRPC in auto-mining");
                        } else {
                            throw e;
                        }
                    }
                );
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
            // TODO remove the skip below when TestRPC is fixed.
            if (isTestRPC) this.skip("For some reason TestRPC cannot trace up to the missing opcode");
            const self = this;
            return instance.doInvalid({ from: owner, gas: MAX_GAS })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(
                    trace => {
                        assert.isTrue(trace.failed || isTestRPC); // TestRPC does not populate this field
                        assert.strictEqual(trace.returnValue, "");
                        const lastStep = trace.structLogs[trace.structLogs.length - 1];
                        assert.strictEqual(lastStep.op, "Missing opcode 0xfe");
                    },
                    e => {
                        if (isTestRPC && e.toString().indexOf("invalid opcode") >= 0) {
                            self.skip("TestRPC in auto-mining");
                        } else {
                            throw e;
                        }
                    }
                );
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
                        assert.isAtLeast(e.toString().indexOf("invalid JUMP"), 0);
                    }
                );
        });

        it("should have failed in trace", function() {
            if (!hasDebug) this.skip("Needs debug API");
            const self = this;
            return instance.doBadJump({ from: owner, gas: MAX_GAS })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(
                    trace => {
                        assert.isTrue(trace.failed || isTestRPC); // TestRPC does not populate this field
                        assert.strictEqual(trace.returnValue, "");
                        const lastStep = trace.structLogs[trace.structLogs.length - 1];
                        assert.strictEqual(lastStep.op, "JUMP");
                    },
                    e => {
                        if (isTestRPC && e.toString().indexOf("invalid JUMP at") >= 0) {
                            self.skip("TestRPC in auto-mining");
                        } else {
                            throw e;
                        }
                    }
                );
        });
    });

    describe("returnNot()", function() {
        it("should return opposite on call", function() {
            return instance.returnNot.call(true)
                .then(returned => assert.isFalse(returned))
                .then(() => instance.returnNot.call(false))
                .then(returned => assert.isTrue(returned));
        });

        it("should return opposite in receipt logs", function() {
            return instance.returnNot(true)
                .then(txObject => {
                    if (typeof txObject.receipt.status !== "undefined") {
                        // Post Byzantium
                        assert.equal(txObject.receipt.status, 1);
                    }
                    assert.isFalse(txObject.logs[0].args.value);
                })
                .then(() => instance.returnNot(false))
                .then(txObject => {
                    if (typeof txObject.receipt.status !== "undefined") {
                        // Post Byzantium
                        assert.equal(txObject.receipt.status, 1);
                    }
                    assert.isTrue(txObject.logs[0].args.value);
                });
        });

        it("should return opposite in trace", function() {
            if (!hasDebug) this.skip("Needs debug API");
            const self = this;
            const returnNotFunc = createRiddledSolidityFunction("returnNot");
            return instance.returnNot(true)
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => {
                    // TODO remove this check when TestRPC is fixed
                    if (trace.returnValue === "" && isTestRPC) {
                        self.skip("TestRPC does not populate the return value");
                    }
                    assert.strictEqual(
                        trace.returnValue,
                        "0000000000000000000000000000000000000000000000000000000000000000");
                    assert.equal(trace.returnValue, 0);
                    const unpackedOutput = returnNotFunc.unpackOutput("0x" + trace.returnValue);
                    assert.isFalse(unpackedOutput);
                    return instance.returnNot(false);
                })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => {
                    assert.strictEqual(
                        trace.returnValue,
                        "0000000000000000000000000000000000000000000000000000000000000001");
                    assert.equal(trace.returnValue, 1);
                    const unpackedOutput = returnNotFunc.unpackOutput("0x" + trace.returnValue);
                    assert.isTrue(unpackedOutput);
                });
        });
    });

    describe("returnMinusOne()", function() {
        const MAX_UINT = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
        it("should return minus 1 on call", function() {
            return instance.returnMinusOne.call(20)
                .then(returned => assert.strictEqual(returned.toString(10), "19"))
                .then(() => instance.returnMinusOne.call(1))
                .then(returned => assert.strictEqual(returned.toString(10), "0"))
                .then(() => instance.returnMinusOne.call(0))
                .then(returned => assert.strictEqual(returned.toString(16), MAX_UINT));
        });

        it("should return minus 1 in receipt logs", function() {
            return instance.returnMinusOne(20)
                .then(txObject => {
                    if (typeof txObject.receipt.status !== "undefined") {
                        // Post Byzantium
                        assert.equal(txObject.receipt.status, 1);
                    }
                    assert.strictEqual(txObject.logs[0].args.value.toString(10), "19");
                })
                .then(() => instance.returnMinusOne(1))
                .then(txObject => {
                    if (typeof txObject.receipt.status !== "undefined") {
                        // Post Byzantium
                        assert.equal(txObject.receipt.status, 1);
                    }
                    assert.strictEqual(txObject.logs[0].args.value.toString(10), "0");
                })
                .then(() => instance.returnMinusOne(0))
                .then(txObject => {
                    if (typeof txObject.receipt.status !== "undefined") {
                        // Post Byzantium
                        assert.equal(txObject.receipt.status, 1);
                    }
                    assert.strictEqual(txObject.logs[0].args.value.toString(16), MAX_UINT);
                });
        });

        it("should return minus 1 in trace", function() {
            if (!hasDebug) this.skip("Needs debug API");
            const self = this;
            const returnMinusOneFunc = createRiddledSolidityFunction("returnMinusOne");
            return instance.returnMinusOne(20)
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => {
                    // TODO remove this check when TestRPC is fixed
                    if (trace.returnValue === "" && isTestRPC) {
                        self.skip("TestRPC does not populate the return value");
                    }
                    assert.strictEqual(
                        trace.returnValue,
                        "0000000000000000000000000000000000000000000000000000000000000013");
                    assert.equal("0x" + trace.returnValue, 19);
                    const unpackedOutput = returnMinusOneFunc.unpackOutput("0x" + trace.returnValue);
                    assert.strictEqual(unpackedOutput.toString(10), "19");
                    return instance.returnMinusOne(1);
                })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => {
                    assert.strictEqual(
                        trace.returnValue,
                        "0000000000000000000000000000000000000000000000000000000000000000");
                    assert.equal(trace.returnValue, 0);
                    const unpackedOutput = returnMinusOneFunc.unpackOutput("0x" + trace.returnValue);
                    assert.strictEqual(unpackedOutput.toString(10), "0");
                    return instance.returnMinusOne(0);
                })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => assert.strictEqual(trace.returnValue, MAX_UINT));
        });
    });

    describe("returnMinusPlusOne()", function() {
        const MAX_UINT = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
        it("should return minus and plus 1 on call", function() {
            return instance.returnMinusPlusOne.call(20)
                .then(returned => {
                    assert.strictEqual(returned[0].toString(10), "19");
                    assert.strictEqual(returned[1].toString(10), "21");
                })
                .then(() => instance.returnMinusPlusOne.call(1))
                .then(returned => {
                    assert.strictEqual(returned[0].toString(10), "0");
                    assert.strictEqual(returned[1].toString(10), "2");
                })
                .then(() => instance.returnMinusPlusOne.call(0))
                .then(returned => {
                    assert.strictEqual(returned[0].toString(16), MAX_UINT);
                    assert.strictEqual(returned[1].toString(10), "1");
                });
        });

        it("should return minus and plus 1 in receipt logs", function() {
            return instance.returnMinusPlusOne(20)
                .then(txObject => {
                    if (typeof txObject.receipt.status !== "undefined") {
                        // Post Byzantium
                        assert.equal(txObject.receipt.status, 1);
                    }
                    assert.strictEqual(txObject.logs[0].args.value1.toString(10), "19");
                    assert.strictEqual(txObject.logs[0].args.value2.toString(10), "21");
                })
                .then(() => instance.returnMinusPlusOne(1))
                .then(txObject => {
                    if (typeof txObject.receipt.status !== "undefined") {
                        // Post Byzantium
                        assert.equal(txObject.receipt.status, 1);
                    }
                    assert.strictEqual(txObject.logs[0].args.value1.toString(10), "0");
                    assert.strictEqual(txObject.logs[0].args.value2.toString(10), "2");
                })
                .then(() => instance.returnMinusPlusOne(0))
                .then(txObject => {
                    if (typeof txObject.receipt.status !== "undefined") {
                        // Post Byzantium
                        assert.equal(txObject.receipt.status, 1);
                    }
                    assert.strictEqual(txObject.logs[0].args.value1.toString(16), MAX_UINT);
                    assert.strictEqual(txObject.logs[0].args.value2.toString(10), "1");
                });
        });

        it("should return minus and plus 1 in trace", function() {
            if (!hasDebug) this.skip("Needs debug API");
            const self = this;
            const returnMinusPlusOneFunc = createRiddledSolidityFunction("returnMinusPlusOne");
            return instance.returnMinusPlusOne(20)
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => {
                    // TODO remove this check when TestRPC is fixed
                    if (trace.returnValue === "" && isTestRPC) {
                        self.skip("TestRPC does not populate the return value");
                    }
                    assert.strictEqual(
                        trace.returnValue,
                        "0000000000000000000000000000000000000000000000000000000000000013" +
                        "0000000000000000000000000000000000000000000000000000000000000015");
                    const unpackedOutputs = returnMinusPlusOneFunc.unpackOutput("0x" + trace.returnValue);
                    assert.strictEqual(unpackedOutputs[0].toString(10), "19");
                    assert.strictEqual(unpackedOutputs[1].toString(10), "21");
                    return instance.returnMinusPlusOne(1);
                })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => {
                    assert.strictEqual(
                        trace.returnValue,
                        "0000000000000000000000000000000000000000000000000000000000000000" +
                        "0000000000000000000000000000000000000000000000000000000000000002");
                    const unpackedOutputs = returnMinusPlusOneFunc.unpackOutput("0x" + trace.returnValue);
                    assert.strictEqual(unpackedOutputs[0].toString(10), "0");
                    assert.strictEqual(unpackedOutputs[1].toString(10), "2");
                    return instance.returnMinusPlusOne(0);
                })
                .then(txObject => web3.debug.traceTransactionPromise(txObject.tx))
                .then(trace => {
                    assert.strictEqual(
                        trace.returnValue,
                        MAX_UINT +
                        "0000000000000000000000000000000000000000000000000000000000000001");
                    const unpackedOutputs = returnMinusPlusOneFunc.unpackOutput("0x" + trace.returnValue);
                    assert.strictEqual(unpackedOutputs[0].toString(16), MAX_UINT);
                    assert.strictEqual(unpackedOutputs[1].toString(10), "1");
                });
        });
    });

});