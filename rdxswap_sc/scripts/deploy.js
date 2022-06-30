
const { parseUnits } = require("ethers/lib/utils");
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // const rdxFactory = await ethers.getContractFactory("RedDotToken");
  // rdxContract = await rdxFactory.deploy();
  // await rdxContract.deployed();
  // console.log(rdxContract.address)
  // 0xf502F5266A9ED86a58775499a9728f397a2e33C6

  // const wjkFactory = await ethers.getContractFactory("WojakToken");
  // wjkContract = await wjkFactory.deploy();
  // await wjkContract.deployed();
  // console.log(wjkContract.address)
  // 0x5115E5b0A2CdDDe4f5b80f674855dff5b5BB3b66

  // const pooFactory = await ethers.getContractFactory('PoolPair');
  // pooContract = await pooFactory.deploy('0xf502F5266A9ED86a58775499a9728f397a2e33C6', '0x5115E5b0A2CdDDe4f5b80f674855dff5b5BB3b66');
  // await pooContract.deployed();
  // console.log(pooContract.address)
  // 0xeEBB4792E21928081cD51B51450Ff205C7C41fb1

}

const runMain = async () => {
  try {
    await main()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

runMain()

