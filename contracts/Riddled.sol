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
}