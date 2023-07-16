import axios from "axios";
import { ethers } from "ethers";
import BridgeABI from "./abi/Bridge.json";
import MantaABI from "./abi/manta.json";

const userPrivateKey = "";

const ethProvider = new ethers.providers.JsonRpcProvider(
  "https://ethereum-goerli.publicnode.com"
);
const moonbeamProvider = new ethers.providers.JsonRpcProvider("");

const ethChainID = 5;
const moonbeamChainID = 3441005;

const ethMantaAddress = "0xd9b0DDb3e3F3721Da5d0B20f96E0817769c2B46D";
const moonbeamMantaAddress = "0xd9b0DDb3e3F3721Da5d0B20f96E0817769c2B46D";
const mantaContractABI = MantaABI.abi;
const ethMantaContract = new ethers.Contract(ethMantaAddress, mantaContractABI);
const moonbeamMantaContract = new ethers.Contract(
  moonbeamMantaAddress,
  mantaContractABI
);

// refer to https://github.com/celer-network/sgn-v2-contracts/blob/b0cf02c15e25f66279420e3ff6a8b2fe07404bab/contracts/Bridge.sol
const ethBridgeContractAddress = "0x358234B325EF9eA8115291A8b81b7d33A2Fa762D";
const moonbeamBridgeContractAddress =
  "0x358234B325EF9eA8115291A8b81b7d33A2Fa762D";
const bridgeContractABI = BridgeABI.abi;
const ethBridgeContract = new ethers.Contract(
  ethBridgeContractAddress,
  bridgeContractABI
);
const moonbeamBridgeContract = new ethers.Contract(
  moonbeamBridgeContractAddress,
  bridgeContractABI
);

const celerEndpoint = "https://cbridge-v2-test.celer.network/";

async function approve(sourceChain: string) {
  let user;
  if (sourceChain == "eth") {
    user = new ethers.Wallet(userPrivateKey, ethProvider);
  } else {
    user = new ethers.Wallet(userPrivateKey, moonbeamProvider);
  }

  await ethMantaContract
    .connect(user)
    .approve(ethBridgeContractAddress, ethers.constants.MaxUint256);
  console.log(`${user.address} approve the bridge contract on ${sourceChain}`);
}

async function send(sourceChain: string) {
  let user;
  let srcChainID;
  let dstChainID;
  if (sourceChain == "eth") {
    user = new ethers.Wallet(userPrivateKey, ethProvider);
    srcChainID = ethChainID;
    dstChainID = moonbeamChainID;
  } else {
    user = new ethers.Wallet(userPrivateKey, moonbeamProvider);
    srcChainID = moonbeamChainID;
    dstChainID = ethChainID;
  }

  // send 100 manta from eth->moonbeam, max slippage is 0.5%
  const nonce = Date.now();
  const maxSlippage = 5000; // 0.5%

  // bytes32 transferId = keccak256(
  //     abi.encodePacked(msg.sender, _receiver, _token, _amount, _dstChainId, _nonce, uint64(block.chainid))
  // );
  const transfer_id = ethers.utils.solidityKeccak256(
    ["address", "address", "address", "uint256", "uint64", "uint64", "uint64"],
    [
      user.address, /// User's wallet address,
      user.address, /// User's wallet address,
      ethMantaAddress, /// Wrap token address/ ERC20 token address
      ethers.utils.parseEther("100").toString(), /// Send amount in String
      dstChainID.toString(), /// Destination chain id
      nonce.toString(), /// Nonce
      srcChainID, /// Source chain id
    ]
  );

  await ethBridgeContract
    .connect(user)
    .send(
      user.address,
      ethMantaAddress,
      ethers.utils.parseEther("100"),
      dstChainID,
      nonce,
      maxSlippage
    );
  console.log("trasferID is ", transfer_id);
  return transfer_id;
}

async function getTransferStatus(transferID: string): Promise<any> {
  try {
    const data = { transfer_id: transferID };
    const response = await axios.post(
      `${celerEndpoint}/v2/getTransferStatus`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

async function main() {
  await approve("eth");
  const transferID = await send("eth");

  let status = await getTransferStatus(transferID);
  console.log(status);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
