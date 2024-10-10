import { ApiPromise, WsProvider } from '@polkadot/api';
import { ParaId } from '@polkadot/types/interfaces';
import { u8aToHex } from '@polkadot/util';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv)).options({
  network: { type: 'string', demandOption: true, alias: 'n', default: 'moonbeam' },
  percent: { type: 'number', demandOption: true, alias: 'p', default: 15 },
}).argv;

// Create Provider
let wsParaProvider;
let wsRelayprovider;
let paraID;
let feeAmount = BigInt(0);
let refTime = BigInt(0);
let proofSize = BigInt(0);
if (argv['network'] === 'moonbeam') {
  wsParaProvider = new WsProvider('wss://wss.api.moonbeam.network');
  wsRelayprovider = new WsProvider('wss://polkadot-rpc.dwellir.com');
  paraID = 2004;
  feeAmount = BigInt(10000000000);
  refTime = BigInt(1000000000);
  proofSize = BigInt(128000);
} else if (argv['network'] === 'moonriver') {
  wsParaProvider = new WsProvider('wss://wss.api.moonriver.moonbeam.network');
  wsRelayprovider = new WsProvider('wss://kusama-rpc.dwellir.com');
  paraID = 2023;
  feeAmount = BigInt(10000000000);
  refTime = BigInt(1000000000);
  proofSize = BigInt(128000);
} else {
  console.error('Network not supported');
  process.exit();
}

const main = async () => {
  // Load Provider
  const apiPara = await ApiPromise.create({
    provider: wsParaProvider,
    noInitWarn: true,
  });
  const apiRelay = await ApiPromise.create({
    provider: wsRelayprovider,
    noInitWarn: true,
  });
  await apiPara.isReady;
  await apiRelay.isReady;

  // Get Sov Account as Child and Sibling
  const [relayAccount, paraAccount] = calculateSovAddress(apiRelay, paraID);

  // Get Balance in Relay Chain
  const balance = (await apiRelay.query.system.account(relayAccount)).toHuman();
  const spendBalance =
    BigInt(balance['data']['free'].replaceAll(',', '')) -
    BigInt(balance['data']['reserved'].replaceAll(',', ''));

  // Calculate Percent
  const balanceTransfer = (spendBalance * BigInt(argv['percent'])) / BigInt(100);

  // Construct Call to AH
  const destRelay = {
    V4: {
      parents: 0,
      interior: {
        X1: [
          {
            Parachain: 1000,
          },
        ],
      },
    },
  };

  const benefRelay = {
    V4: {
      parents: 0,
      interior: {
        X1: [
          {
            AccountId32: {
              network: null,
              id: paraAccount,
            },
          },
        ],
      },
    },
  };

  const assetRelay = {
    V4: [
      {
        id: {
          parents: 0,
          interior: 'Here',
        },
        fun: {
          Fungible: balanceTransfer,
        },
      },
    ],
  };

  let relayTX = await apiRelay.tx.xcmPallet.transferAssets(
    destRelay,
    benefRelay,
    assetRelay,
    0,
    'Unlimited'
  );

  console.log(
    (await relayTX.paymentInfo('5Ec4AhPZYgv9Q1KUajtv2RieJJmhPdn9cnvKxjpxuJHVoGFt')).toHuman()
  );

  // Build Moonbeam/Moonriver Call
  const destPara = {
    V4: {
      parents: 1,
      interior: 'Here',
    },
  };

  let paraTx = await apiPara.tx.xcmTransactor.transactThroughSovereign(
    destPara,
    null,
    {
      currency: {
        AsCurrencyId: { ForeignAsset: '42259045809535163221576417993425387648' },
      },
      feeAmount: feeAmount,
    },
    relayTX.method.toHex(),
    'SovereignAccount',
    {
      transactRequiredWeightAtMost: { refTime: refTime, proofSize: proofSize },
      overallWeight: 'Unlimited',
    },
    true
  );

  console.log(`Call to transfer ${argv['percent']}\% from ${argv['network']} to AH`);
  console.log(paraTx.method.toHex());
  await apiPara.disconnect();
  await apiRelay.disconnect();
};

const calculateSovAddress = (api, paraID) => {
  const targetParaId: ParaId = api.createType('ParaId', paraID);

  const sovAddressRelay = u8aToHex(
    new Uint8Array([...new TextEncoder().encode('para'), ...targetParaId.toU8a()])
  ).padEnd(66, '0');

  const sovAddressPara = u8aToHex(
    new Uint8Array([...new TextEncoder().encode('sibl'), ...targetParaId.toU8a()])
  ).padEnd(66, '0');

  return [sovAddressRelay, sovAddressPara];
};

main()
  .catch(console.error)
  .finally(() => process.exit());
