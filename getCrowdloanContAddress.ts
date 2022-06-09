/*
  Simple code snippet to fetch parachain crowdloan contribution 
  addresses and store them in a JSON file
*/
import { ApiPromise, WsProvider } from "@polkadot/api";
import * as fs from "fs";
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
  const rawRewardsList = await api.query.crowdloanRewards.accountsPayable.entries();

  let rewardsAddresses = [];

  rawRewardsList.forEach(([key, exposure]) => {
    rewardsAddresses.push({
      account: key.args.map((k) => k.toHuman()),
      rewards: exposure.toHuman(),
    });
  });

  // Save data to JSON file
  const dataJSON = JSON.stringify(rewardsAddresses);
  fs.writeFileSync(args["network"] + "_rewards_addresses.json", dataJSON, "utf-8");

  console.log("Done ✔️-- \n");

  await api.disconnect();
};

main();
