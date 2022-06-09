/*
  Simple code snippet to fetch the hash of the latest finalized block
  and retrieve that blocks number. Another strategy might be getting the block
  of the transaction and check if blockTransaction <= blockFinalized
*/
import { ApiPromise, WsProvider } from "@polkadot/api";
import yargs from "yargs";

const args = yargs.options({
  network: { type: "string", demandOption: true, alias: "n" },
}).argv;

// Create Provider
let wsProvider;
if (args["network"] === "moonbeam") {
  wsProvider = new WsProvider("wss://wss.api.moonbeam.network");
} else if (args["network"] === "moonriver") {
  wsProvider = new WsProvider("wss://wss.api.moonriver.moonbeam.network");
} else if (args["network"] === "moonbase") {
  wsProvider = new WsProvider("wss://wss.api.moonbase.moonbeam.network");
} else {
  console.error("Network not supported");
  process.exit();
}

const main = async () => {
  // Wait for Provider
  const api = await ApiPromise.create({
    provider: wsProvider,
  });
  await api.isReady;

  // Get latest block that is finalized
  const finalizedHeadHash = await api.rpc.chain.getFinalizedHead();

  // Get finalized block to retrieve number
  const finalizedBlock = (await api.rpc.chain.getBlock(finalizedHeadHash)).toJSON();

  // Block number is stored in finalizedBlock.block.header.number
  console.log(`Block number ${finalizedBlock.block["header"].number} is the last Finalized`);

  await api.disconnect();
};

main();
