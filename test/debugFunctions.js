"use strict";

const addDebugFunctions = require("../utils/debugFunctions.js");
const chai = require('chai');
chai.should();
const assert = chai.assert;
const sinon = require('sinon');
const sinonChai = require("sinon-chai");
chai.use(sinonChai);

describe("Debug Functions", function() {
    let web3;

    beforeEach("should mock web3", function() {
        web3 = {
            currentProvider: {
                sendAsync: sinon.stub()
            }
        }
    });

    describe("basic setup", function() {
        it("should create debug object if absent", function() {
            assert.isUndefined(web3.debug);
            addDebugFunctions(web3);
            assert.isDefined(web3.debug);
        });

        it("should reuse debug object if present", function() {
            web3.debug = {
                pretendField: 1
            };
            addDebugFunctions(web3);
            assert.isDefined(web3.debug);
            assert.isDefined(web3.debug.memStats);
            assert.strictEqual(web3.debug.pretendField, 1);
        });

        it("should add memStats function if absent", function() {
            web3.debug = {};
            assert.isUndefined(web3.debug.memStats);
            addDebugFunctions(web3);
            assert.isDefined(web3.debug.memStats);
        });

        it("should leave memStats unchanged if present", function() {
            web3.debug = {
                memStats: "memStats1"
            };
            assert.isDefined(web3.debug.memStats);
            addDebugFunctions(web3);
            assert.strictEqual(web3.debug.memStats, "memStats1");
        });

        it("should add traceTransaction function if absent", function() {
            web3.debug = {};
            assert.isUndefined(web3.debug.traceTransaction);
            addDebugFunctions(web3);
            assert.isDefined(web3.debug.traceTransaction);
        });

        it("should leave traceTransaction unchanged if present", function() {
            web3.debug = {
                traceTransaction: "traceTransaction1"
            };
            assert.isDefined(web3.debug.traceTransaction);
            addDebugFunctions(web3);
            assert.strictEqual(web3.debug.traceTransaction, "traceTransaction1");
        });
    });

    describe("memStats", function() {
        beforeEach("should add Debug functions", function() {
            addDebugFunctions(web3);
        });

        it("should pass parameter along", function() {
            const callback = "callback1";
            web3.debug.memStats(callback);
            web3.currentProvider.sendAsync.should.have.been.calledOnce;
            web3.currentProvider.sendAsync.should.have.been.calledWith(
                {
                    jsonrpc: "2.0",
                    method: "debug_memStats",
                    params: [],
                    id: sinon.match.number
                },
                sinon.match.func);
        });

        it("should return same if error", function() {
            web3.currentProvider.sendAsync.yields("error1", "fakeResult1");
            const callback = sinon.stub();
            web3.debug.memStats(callback);

            callback.should.have.been.calledOnce;
            callback.should.have.been.calledWith("error1", "fakeResult1");
        });

        it("should process return if ok", function() {
            web3.currentProvider.sendAsync.yields(null, { result: "fakeResult1" });
            const callback = sinon.stub();
            web3.debug.memStats(callback);

            callback.should.have.been.calledOnce;
            callback.should.have.been.calledWith(null, "fakeResult1");
        });
    });

    describe("traceTransaction", function() {
        beforeEach("should add Debug functions", function() {
            addDebugFunctions(web3);
        });

        it("should pass parameter along", function() {
            const callback = "callback1";
            web3.debug.traceTransaction(123, callback);
            web3.currentProvider.sendAsync.should.have.been.calledOnce;
            web3.currentProvider.sendAsync.should.have.been.calledWith(
                {
                    jsonrpc: "2.0",
                    method: "debug_traceTransaction",
                    params: [ 123 ],
                    id: sinon.match.number
                },
                sinon.match.func);
        });

        it("should return same if error", function() {
            web3.currentProvider.sendAsync.yields("error1", "fakeResult1");
            const callback = sinon.stub();
            web3.debug.traceTransaction("fakeHash1", callback);

            callback.should.have.been.calledOnce;
            callback.should.have.been.calledWith("error1", "fakeResult1");
        });

        it("should process return if ok", function() {
            web3.currentProvider.sendAsync.yields(null, { result: "fakeResult1" });
            const callback = sinon.stub();
            web3.debug.traceTransaction("fakeHash1", callback);

            callback.should.have.been.calledOnce;
            callback.should.have.been.calledWith(null, "fakeResult1");
        });
    });
});

