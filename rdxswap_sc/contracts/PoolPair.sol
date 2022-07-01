// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC20.sol";
import "./SafeERC20.sol";
import "./LPToken.sol";
import "./libraries/SafeMath.sol";
// import "hardhat/console.sol";

contract PoolPair is LPToken {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );

    event Swap(
        address indexed sender,
        IERC20 tokenIn,
        uint256 tokenInAmount,
        uint256 tokenOutAmount
    );

    IERC20 public token0;
    IERC20 public token1;
    uint256 private reserve0 = 0;
    uint256 private reserve1 = 0;
    uint256 public lpTokenPerToken;

    constructor(IERC20 _token0, IERC20 _token1) {
        token0 = _token0;
        token1 = _token1;
    }

    function getReserves()
        public
        view
        returns (uint256 _reserve0, uint256 _reserve1)
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
    }

    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) internal pure returns (uint256 amountB) {
        require(amountA > 0, "INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * reserveB) / (reserveA);
    }

    function _addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) private view returns (uint256 amountA, uint256 amountB) {
        (uint256 reserveA, uint256 reserveB) = getReserves();
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = quote(
                    amountBDesired,
                    reserveB,
                    reserveA
                );
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, "INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    )
        public
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        (amountA, amountB) = _addLiquidity(
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );
        IERC20 _token0 = token0;
        IERC20 _token1 = token1;
        _token0.safeTransferFrom(address(msg.sender), address(this), amountA);
        _token1.safeTransferFrom(address(msg.sender), address(this), amountB);
        liquidity = mint(to);
    }

    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }

    function mint(address to) private returns (uint256 liquidity) {
        (uint256 _reserve0, uint256 _reserve1) = getReserves();
        uint256 balance0 = token0.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));
        uint256 amount0 = balance0.sub(_reserve0);
        uint256 amount1 = balance1.sub(_reserve1);

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = (amount0 * amount1) / 1e12;
            lpTokenPerToken = liquidity / (min(amount0, amount1));
            _mint(to, liquidity);
        } else {
            liquidity = lpTokenPerToken * (min(amount0, amount1));
            _mint(to, liquidity);
        }
        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");

        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    function _update(uint256 balance0, uint256 balance1) private {
        reserve0 = uint256(balance0);
        reserve1 = uint256(balance1);
    }

    function removeLiquidity(
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) public {
        transferByPool(msg.sender, address(this), liquidity);
        (uint256 amount0, uint256 amount1) = burnAndTransfer(to);

        require(amount0 >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amount1 >= amountBMin, "INSUFFICIENT_B_AMOUNT");
    }

    function burnAndTransfer(address to)
        internal
        returns (uint256 amount0, uint256 amount1)
    {
        IERC20 _token0 = token0;
        IERC20 _token1 = token1;

        uint256 _totalSupply = totalSupply();
        uint256 liquidity = balanceOf(address(this));

        uint256 balance0 = _token0.balanceOf(address(this));
        uint256 balance1 = _token1.balanceOf(address(this));

        amount0 = (liquidity * balance0) / (_totalSupply);
        amount1 = (liquidity * balance1) / (_totalSupply);

        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_LIQUIDITY_BURNED");
        _burn(address(this), liquidity);
        _token0.safeTransfer(to, amount0);
        _token1.safeTransfer(to, amount1);

        balance0 = _token0.balanceOf(address(this));
        balance1 = _token1.balanceOf(address(this));

        _update(balance0, balance1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(
        IERC20 tokenIn,
        uint256 amount,
        uint256 minOut
    ) public returns (bool) {
        (uint256 _reserve0, uint256 _reserve1) = getReserves();
        IERC20 _token0 = token0;
        IERC20 _token1 = token1;
        uint256 tokenOutAmount;
        require(tokenIn == _token0 || tokenIn == _token1, "swap in wrong pool");

        if (tokenIn == _token0) {
            tokenOutAmount = (_reserve1 * amount) / (_reserve0 + amount);
            require(tokenOutAmount > minOut, "swap dose not statisfied user");
            _token0.safeTransferFrom(
                address(msg.sender),
                address(this),
                amount
            );
            _token1.safeTransfer(address(msg.sender), tokenOutAmount);
        } else if (tokenIn == _token1) {
            tokenOutAmount = (_reserve0 * amount) / (_reserve1 + amount);
            require(tokenOutAmount > minOut, "swap dose not statisfied user");
            _token1.safeTransferFrom(
                address(msg.sender),
                address(this),
                amount
            );
            _token0.safeTransfer(address(msg.sender), tokenOutAmount);
        }
        uint256 balance0 = _token0.balanceOf(address(this));
        uint256 balance1 = _token1.balanceOf(address(this));
        _update(balance0, balance1);
        emit Swap(msg.sender, tokenIn, amount, tokenOutAmount);
        return true;
    }
}
