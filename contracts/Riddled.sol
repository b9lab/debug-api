pragma solidity ^0.4.10;

contract Riddled {
    function doRevert() {
        revert();
    }

    function doInvalid() {
        assembly { invalid }
    }

    function doBadJump() {
        assembly { jump(0) }
    }

    event LogBool(bool value);

    function returnNot(bool value) returns (bool returned) {
        returned = !value;
        LogBool(returned);
    }

    event LogUint(uint value);

    function returnMinusOne(uint value) returns (uint returned) {
        returned = value - 1;
        LogUint(returned);
    }
}