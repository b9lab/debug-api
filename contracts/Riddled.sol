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

    event LogUintString(uint value1, string value2);

    function returnMinusOneCiao(uint value) returns (uint returned1, string returned2) {
        returned1 = value - 1;
        returned2 = "Ciao mondo";
        LogUintString(returned1, returned2);
    }
}