import { ethers } from "ethers";
import BridgeABI from "./abi/Bridge.json";
import MantaABI from "./abi/manta.json";

const userPrivateKey = "";

const ethProvider = new ethers.providers.JsonRpcProvider('');
const moonbeamProvider = new ethers.providers.JsonRpcProvider('');

const ethMantaAddress = "0xd9b0DDb3e3F3721Da5d0B20f96E0817769c2B46D";
const moonbeamMantaAddress = "";
const mantaContractABI = MantaABI.abi;
const ethMantaContract = new ethers.Contract(ethMantaAddress, mantaContractABI);
const moonbeamMantaContract = new ethers.Contract(moonbeamMantaAddress, mantaContractABI);

// refer to https://github.com/celer-network/sgn-v2-contracts/blob/b0cf02c15e25f66279420e3ff6a8b2fe07404bab/contracts/Bridge.sol
const ethBridgeContractAddress = "";
const moonbeamBridgeContractAddress = "";
const bridgeContractABI = BridgeABI.abi;
const ethBridgeContract = new ethers.Contract(ethBridgeContractAddress, bridgeContractABI);
const moonbeamBridgeContract = new ethers.Contract(moonbeamBridgeContractAddress, bridgeContractABI);

async function approve(sourceChain: string) {
    let user;
    if (sourceChain == "eth") {
        user = new ethers.Wallet(userPrivateKey, ethProvider);
    } else {
        user = new ethers.Wallet(userPrivateKey, moonbeamProvider);
    }

    await ethMantaContract.connect(user).approve(ethBridgeContractAddress, ethers.constants.MaxUint256);
    console.log(`${user.address} approve the bridge contract on ${sourceChain}`)
}

async function send(sourceChain: string) {
    let user;
    if (sourceChain == "eth") {
        user = new ethers.Wallet(userPrivateKey, ethProvider);
    } else {
        user = new ethers.Wallet(userPrivateKey, moonbeamProvider);
    }

    // send 100 manta from eth->moonbeam, max slippage is 0.5%
    // 
    const nonce = Date.now();
    await ethBridgeContract.connect(user).send(
        user.address,
        ethMantaAddress,
        ethers.utils.parseEther("100"),
        nonce,
        5000
    );
}


