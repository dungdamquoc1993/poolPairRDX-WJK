// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20.sol";

contract RedDotToken is ERC20("RedDot Token", "RDX") {
    constructor() {
        _mint(msg.sender, 10**6 * 10**12);
    }

    function mint() public {
        _mint(address(msg.sender), 1000 * 10**12);
    }
}


