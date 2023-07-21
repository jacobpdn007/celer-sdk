import axios from "axios";
import { ethers } from "ethers";
import BridgeABI from "./abi/Bridge.json";
import MantaABI from "./abi/manta.json";

const userPrivateKey = "";

const mantaContractABI = MantaABI.abi;
const bridgeContractABI = BridgeABI.abi;

const ethProvider = new ethers.providers.JsonRpcProvider(
  "https://ethereum-goerli.publicnode.com"
);
const ethChainID = 5;
const ethMantaAddress = "0xd9b0DDb3e3F3721Da5d0B20f96E0817769c2B46D";
const ethBridgeContractAddress = "0x358234B325EF9eA8115291A8b81b7d33A2Fa762D";
const ethMantaContract = new ethers.Contract(ethMantaAddress, mantaContractABI);
const ethBridgeContract = new ethers.Contract(
  ethBridgeContractAddress,
  bridgeContractABI
);

const moonbeamProvider = new ethers.providers.JsonRpcProvider(
  "https://rpc.api.moonbase.moonbeam.network"
);
const moonbeamChainID = 1287;
const moonbeamMantaAddress = "0xfFFffFFf7D3875460d4509eb8d0362c611B4E841";
const moonbeamBridgeContractAddress =
  "0x841ce48F9446C8E281D3F1444cB859b4A6D0738C";
const moonbeamMantaContract = new ethers.Contract(
  moonbeamMantaAddress,
  mantaContractABI
);
const moonbeamBridgeContract = new ethers.Contract(
  moonbeamBridgeContractAddress,
  bridgeContractABI
);

const celerEndpoint = "https://cbridge-v2-test.celer.network";

async function approve(sourceChain: string) {
  let user;
  if (sourceChain == "eth") {
    user = new ethers.Wallet(userPrivateKey, ethProvider);
    await ethMantaContract
      .connect(user)
      .approve(ethBridgeContractAddress, ethers.constants.MaxUint256);
  } else {
    user = new ethers.Wallet(userPrivateKey, moonbeamProvider);
    await moonbeamMantaContract
      .connect(user)
      .approve(moonbeamBridgeContractAddress, ethers.constants.MaxUint256);
  }

  console.log(`${user.address} approve the bridge contract on ${sourceChain}`);
}

async function send(sourceChain: string) {
  let user;
  let srcChainID;
  let dstChainID;
  let sourceToken;
  let bridge;
  if (sourceChain == "eth") {
    user = new ethers.Wallet(userPrivateKey, ethProvider);
    srcChainID = ethChainID;
    dstChainID = moonbeamChainID;
    sourceToken = ethMantaAddress;
    bridge = ethBridgeContract;
  } else {
    user = new ethers.Wallet(userPrivateKey, moonbeamProvider);
    srcChainID = moonbeamChainID;
    dstChainID = ethChainID;
    sourceToken = moonbeamMantaAddress;
    bridge = moonbeamBridgeContract;
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
      sourceToken, /// ERC20 token address
      ethers.utils.parseEther("100").toString(), /// Send amount in String
      dstChainID.toString(), /// Destination chain id
      nonce.toString(), /// Nonce
      srcChainID, /// Source chain id
    ]
  );

  await bridge
    .connect(user)
    .send(
      user.address,
      sourceToken,
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
  await approve("moonbeam");
  const transferID = await send("moonbeam");

  let status = await getTransferStatus(transferID);
  console.log(status);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
