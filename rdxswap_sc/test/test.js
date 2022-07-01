const { expect } = require("chai");
const { parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");


describe("Pool Pair", function () {
  let pooContract, rdxContract, wjkContract
  let a0 = 0, a1 = 0, a2 = 0, a3 = 0
  beforeEach(async () => {
    const [b0, b1, b2, b3] = await ethers.getSigners()
    a0 = b0, a1 = b1, a2 = b2, a3 = b3

    const rdxFactory = await ethers.getContractFactory("RedDotToken");
    rdxContract = await rdxFactory.deploy();
    await rdxContract.deployed();

    const wjkFactory = await ethers.getContractFactory("WojakToken");
    wjkContract = await wjkFactory.deploy();
    await wjkContract.deployed();

    const pooFactory = await ethers.getContractFactory('PoolPair');
    pooContract = await pooFactory.deploy(rdxContract.address, wjkContract.address);
    await pooContract.deployed();
    await rdxContract.connect(a0).transfer(a1.address, parseUnits('1000', 12))
    await wjkContract.connect(a0).transfer(a1.address, parseUnits('1000', 12))

    await rdxContract.connect(a1).approve(pooContract.address, parseUnits('1000', 12))
    await wjkContract.connect(a1).approve(pooContract.address, parseUnits('1000', 12))
    await pooContract.connect(a1).approve(pooContract.address, parseUnits('500', 12))

  })
  it('test setup ', async () => {
    await rdxContract.connect(a1).mint()
    await wjkContract.connect(a1).mint()
    // add liquidity
    let rdxDesired = 10
    let wjkDesired = 100
    let rdxMin = 10
    let wjkMin = 100
    let a1RdxAllowance = (await rdxContract.allowance(a1.address, pooContract.address)) / 10 ** 12
    let a1WkjAllowance = (await wjkContract.allowance(a1.address, pooContract.address)) / 10 ** 12
    console.log('a1 add liquidity')
    if (a1RdxAllowance - rdxDesired >= 0 && a1WkjAllowance - wjkDesired >= 0) {
      console.log('process add liquidity straight up')
      await pooContract.connect(a1).addLiquidity(
        parseUnits(`${rdxDesired}`, 12), parseUnits(`${wjkDesired}`, 12),
        parseUnits(`${rdxMin}`, 12), parseUnits(`${wjkMin}`, 12),
        a1.address)
    } else {
      if (a1RdxAllowance - rdxDesired < 0) {
        console.log(`approve more rdx: ${rdxDesired}`)
        let tx = await rdxContract.connect(a1).approve(pooContract.address, parseUnits(`${rdxDesired}`, 12))
        await tx.wait()
      }
      if (a1WkjAllowance - wjkDesired < 0) {
        console.log(`approve more wjk: ${wjkDesired}`)
        let tx = await wjkContract.connect(a1).approve(pooContract.address, parseUnits(`${wjkDesired}`, 12))
        await tx.wait()
      }
      a1RdxAllowance = (await rdxContract.allowance(a1.address, pooContract.address)) / 10 ** 12
      a1WkjAllowance = (await wjkContract.allowance(a1.address, pooContract.address)) / 10 ** 12
      if (a1RdxAllowance - rdxDesired >= 0 && a1WkjAllowance - wjkDesired >= 0) {
        await pooContract.connect(a1).addLiquidity(
          parseUnits(`${rdxDesired}`, 12), parseUnits(`${wjkDesired}`, 12),
          parseUnits(`${rdxMin}`, 12), parseUnits(`${wjkMin}`, 12),
          a1.address)
      }
    }
    console.log(`after a1 deposit ${rdxDesired} rdx and ${wjkDesired} wjk`)
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a1 rdx bal: ', (await rdxContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 wjk bal: ', (await wjkContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 rdlp bal: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)
    console.log()
    // a2 swap
    await rdxContract.connect(a2).mint()
    await wjkContract.connect(a2).mint()
    let a2RdxAllowance = (await rdxContract.allowance(a2.address, pooContract.address)) / 10 ** 12
    let a2WkjAllowance = (await wjkContract.allowance(a2.address, pooContract.address)) / 10 ** 12
    let tokenIn = 'rdx'
    let a2SwapAmount = 100
    let a2MinExpect = 0
    console.log('a2 swap')
    if (a2SwapAmount <= 0) return console.log('please submit an valid amount to swap')

    if (tokenIn == 'rdx') {
      console.log(`swap rdx to wjk: amount is ${a2SwapAmount} rdx`)
      if (a2RdxAllowance - a2SwapAmount >= 0) {
        console.log(`swap directly`)
        await pooContract.connect(a2)
          .swap(rdxContract.address,
            parseUnits(`${a2SwapAmount}`, 12),
            parseUnits(`${a2MinExpect > 0 ? a2MinExpect : 0}`, 12))
      } else {
        console.log(`approve then swap`)
        let tx = await rdxContract.connect(a2).approve(pooContract.address, parseUnits(`${a2SwapAmount}`, 12))
        await tx.wait()
        await pooContract.connect(a2).swap(rdxContract.address,
          parseUnits(`${a2SwapAmount}`, 12), parseUnits('0', 12))
      }
    } else if (tokenIn == 'wjk') {
      console.log(`swap wjk to rdx: amount is ${a2SwapAmount} wjk`)
      if (a2WkjAllowance - a2SwapAmount >= 0) {
        console.log('swap directly')
        await pooContract.connect(a2)
          .swap(wjkContract.address,
            parseUnits(`${a2SwapAmount}`, 12),
            parseUnits(`${a2MinExpect > 0 ? a2MinExpect : 0}`, 12))
      } else {
        console.log('approve then swap')
        let tx = await wjkContract.connect(a2).approve(pooContract.address, parseUnits(`${a2SwapAmount}`, 12))
        await tx.wait()
        await pooContract.connect(a2).swap(wjkContract.address,
          parseUnits(`${a2SwapAmount}`, 12), parseUnits('0', 12))
      }
    }
    console.log(`after a2 swap`)
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a2 rdx bal: ', (await rdxContract.balanceOf(a2.address)) / 10 ** 12)
    console.log('a2 wjk bal: ', (await wjkContract.balanceOf(a2.address)) / 10 ** 12)
    console.log('a2 rdlp bal: ', (await pooContract.balanceOf(a2.address)) / 10 ** 12)

    console.log()
    // a3 swap
    await rdxContract.connect(a3).mint()
    await wjkContract.connect(a3).mint()
    let a3RdxAllowance = (await rdxContract.allowance(a3.address, pooContract.address)) / 10 ** 12
    let a3WkjAllowance = (await wjkContract.allowance(a3.address, pooContract.address)) / 10 ** 12
    tokenIn = 'wjk'
    let a3SwapAmount = 10
    let a3MinExpect = 0
    console.log('a3 swap')
    if (a3SwapAmount <= 0) return console.log('please submit an valid amount to swap')

    if (tokenIn == 'rdx') {
      console.log(`swap rdx to wjk: amount is ${a3SwapAmount} rdx`)
      if (a3RdxAllowance - a3SwapAmount >= 0) {
        console.log(`swap directly`)
        await pooContract.connect(a3)
          .swap(rdxContract.address,
            parseUnits(`${a3SwapAmount}`, 12),
            parseUnits(`${a3MinExpect > 0 ? a3MinExpect : 0}`, 12))
      } else {
        console.log(`approve then swap`)
        let tx = await rdxContract.connect(a3).approve(pooContract.address, parseUnits(`${a3SwapAmount}`, 12))
        await tx.wait()
        await pooContract.connect(a3).swap(rdxContract.address,
          parseUnits(`${a3SwapAmount}`, 12), parseUnits('0', 12))
      }
    } else if (tokenIn == 'wjk') {
      console.log(`swap wjk to rdx: amount is ${a3SwapAmount} wjk`)
      if (a3WkjAllowance - a3SwapAmount >= 0) {
        console.log('swap directly')
        await pooContract.connect(a3)
          .swap(wjkContract.address,
            parseUnits(`${a3SwapAmount}`, 12),
            parseUnits(`${a3MinExpect > 0 ? a3MinExpect : 0}`, 12))
      } else {
        console.log('approve then swap')
        let tx = await wjkContract.connect(a3).approve(pooContract.address, parseUnits(`${a3SwapAmount}`, 12))
        await tx.wait()
        await pooContract.connect(a3)
          .swap(wjkContract.address,
            parseUnits(`${a3SwapAmount}`, 12),
            parseUnits(`${a3MinExpect > 0 ? a3MinExpect : 0}`, 12))
      }
    }
    console.log(`after a3 swap`)
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a3 rdx bal: ', (await rdxContract.balanceOf(a3.address)) / 10 ** 12)
    console.log('a3 wjk bal: ', (await wjkContract.balanceOf(a3.address)) / 10 ** 12)
    console.log('a3 rdlp bal: ', (await pooContract.balanceOf(a3.address)) / 10 ** 12)

    // remove liquidity
    let lpBurn = 100
    let rdxOutMin = 0
    let wjkOutMin = 0
    let a1RdlpAllowance = (await pooContract.allowance(a1.address, pooContract.address)) / 10 ** 12
    console.log()
    console.log('a1 remove liquidity')
    if (a1RdlpAllowance - lpBurn >= 0) {
      console.log('process directly')
      await pooContract.connect(a1).removeLiquidity(parseUnits(`${lpBurn}`, 12),
        parseUnits(`${rdxOutMin}`, 12), parseUnits(`${wjkOutMin}`, 12),
        a1.address)
    } else {
      if (a1RdlpAllowance - lpBurn < 0) {
        console.log(`approve more rdlp: ${lpBurn}`)
        let tx = await pooContract.connect(a1).approve(pooContract.address, parseUnits(`${lpBurn}`, 12))
        await tx.wait()
      }
      a1RdlpAllowance = (await pooContract.allowance(a1.address, pooContract.address)) / 10 ** 12
      if (a1RdlpAllowance - lpBurn >= 0) {
        console.log('process after approve allowance')
        await pooContract.connect(a1).removeLiquidity(parseUnits(`${lpBurn}`, 12),
          parseUnits(`${rdxOutMin}`, 12), parseUnits(`${wjkOutMin}`, 12),
          a1.address)
      }
    }
    console.log(`after a1 remove liquidity ${lpBurn}`)
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a1 rdx bal: ', (await rdxContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 wjk bal: ', (await wjkContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 rdlp bal: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)
  })

  it("add liquidity check desire and min", async () => {
    await pooContract.connect(a1).addLiquidity(parseUnits('10', 12), parseUnits('100', 12), parseUnits('1', 12), parseUnits('10', 12), a1.address)

    console.log('rdx reserve ', (await rdxContract.balanceOf(pooContract.address)) / 10 ** 12)
    console.log('wjk reserve ', (await wjkContract.balanceOf(pooContract.address)) / 10 ** 12)
    console.log('lp token: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)

    await pooContract.connect(a1).addLiquidity(parseUnits('10', 12), parseUnits('100', 12), parseUnits('5', 12), parseUnits('50', 12), a1.address)

    console.log('rdx reserve ', (await rdxContract.balanceOf(pooContract.address)) / 10 ** 12)
    console.log('wjk reserve ', (await wjkContract.balanceOf(pooContract.address)) / 10 ** 12)
    console.log('lp token: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)

    await pooContract.connect(a1).addLiquidity(parseUnits('10', 12), parseUnits('100', 12), parseUnits('5', 12), parseUnits('50', 12), a1.address)

    console.log('rdx reserve ', (await rdxContract.balanceOf(pooContract.address)) / 10 ** 12)
    console.log('wjk reserve ', (await wjkContract.balanceOf(pooContract.address)) / 10 ** 12)
    console.log('lp token: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)
  })

  it('remove liquidity', async () => {
    await pooContract.connect(a1).addLiquidity(parseUnits('1', 12), parseUnits('10', 12), parseUnits('1', 12), parseUnits('10', 12), a1.address)
    await pooContract.connect(a1).addLiquidity(parseUnits('19', 12), parseUnits('190', 12), parseUnits('0', 12), parseUnits('0', 12), a1.address)
    console.log('after add liquidity')
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a1 rdx bal: ', (await rdxContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 wjk bal: ', (await wjkContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 rdlp balance: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)

    await pooContract.connect(a1).removeLiquidity(parseUnits('200', 12), parseUnits('0', 12), parseUnits('0', 12), a1.address)
    console.log('')

    console.log('after remove liquidity')
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a1 rdx bal: ', (await rdxContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 wjk bal: ', (await wjkContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 rdlp bal: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)
  })

  it('swap rdx to wjk', async () => {
    await pooContract.connect(a1).addLiquidity(parseUnits('10', 12), parseUnits('100', 12), parseUnits('0', 12), parseUnits('0', 12), a1.address)
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a1 rdx bal: ', (await rdxContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 wjk bal: ', (await wjkContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 rdlp bal: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)

    await pooContract.connect(a1).swap(rdxContract.address, parseUnits('10', 12), parseUnits('0'))
    console.log('after swap 10 rdx')
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a1 rdx bal: ', (await rdxContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 wjk bal: ', (await wjkContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 rdlp bal: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)
  })

  it('add => swap => remove', async () => {
    await pooContract.connect(a1).addLiquidity(parseUnits('1', 12), parseUnits('10', 12), parseUnits('1', 12), parseUnits('10', 12), a1.address)
    await pooContract.connect(a1).addLiquidity(parseUnits('19', 12), parseUnits('190', 12), parseUnits('0', 12), parseUnits('0', 12), a1.address)
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a1 rdx bal: ', (await rdxContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 wjk bal: ', (await wjkContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 rdlp bal: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)

    await pooContract.connect(a1).swap(rdxContract.address, parseUnits('5', 12), parseUnits('0'))
    console.log('after swap 9800 rdx')
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a1 rdx bal: ', (await rdxContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 wjk bal: ', (await wjkContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 rdlp bal: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)

    await pooContract.connect(a1).removeLiquidity(parseUnits('200', 12), parseUnits('0', 12), parseUnits('0', 12), a1.address)
    console.log('after withdraw liquidity')
    console.log('pool rdx reserve: ', (await pooContract.getReserves())[0] / 10 ** 12)
    console.log('pool wjk reserve: ', (await pooContract.getReserves())[1] / 10 ** 12)
    console.log('a1 rdx bal: ', (await rdxContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 wjk bal: ', (await wjkContract.balanceOf(a1.address)) / 10 ** 12)
    console.log('a1 rdlp bal: ', (await pooContract.balanceOf(a1.address)) / 10 ** 12)

  })

})