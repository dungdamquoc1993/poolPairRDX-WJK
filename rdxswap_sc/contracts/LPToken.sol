// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20.sol";

contract LPToken is ERC20("LP Token", "RDLP") {
    function transferByPool(
        address from,
        address to,
        uint256 amount
    ) internal returns (bool) {
        address spender = address(this);
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }
}
