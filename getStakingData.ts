/*
  Simple code snippet to fetch parachain staking related data using 
  Polkadot.js API - Not to be used in production
  Use at your own discretion
*/
import { ApiPromise, WsProvider } from "@polkadot/api";
import yargs from "yargs";

// Get input arguments
const args = yargs.options({
  network: { type: "string", demandOption: true, alias: "n" },
}).argv;

// Create Provider
let wsProvider;
if (args["network"] === "moonbeam") {
  wsProvider = new WsProvider("wss://wss.api.moonbeam.network");
} else if (args["network"] === "moonriver") {
  wsProvider = new WsProvider("wss://wss.api.moonriver.moonbeam.network");
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

  // Get the list of active collators
  const collatorList: any = (await api.query.parachainStaking.selectedCandidates()).toJSON();

  // Get details of each collator
  for (let i = 0; i < collatorList.length - 1; i++) {
    console.log(`\n Collator: ${collatorList[i]}`);
    const collatorData = await api.query.parachainStaking.candidateInfo(collatorList[i]);
    console.log(collatorData.toHuman());
  }

  await api.disconnect();
};

main();
