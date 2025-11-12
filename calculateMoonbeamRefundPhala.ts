import { ApiPromise, WsProvider } from '@polkadot/api';

// Create Provider
let wsMBProvider = new WsProvider('wss://wss.api.moonbeam.network');
let wsPHAprovider = new WsProvider('wss://phala.api.onfinality.io/public-ws');

// Tx Fee Items
let feeAmount = BigInt(10000000000000);
let refTime = BigInt(3000000000);
let proofSize = BigInt(50000);

// Transfer Details:
const transferDetails = [
  {
    amount: BigInt('200210000000000'),
    target: '442Lci2FBDnk76VuWeCGNPRgUh9HZjRoPZoRefagHfR6ALjA',
  },
  {
    amount: BigInt('4000000000000'),
    target: '3zghSGBnHXA2NBikUqBCP18vS5LaNNUnHgJCoi5yatWppZjX',
  },
  {
    amount: BigInt('10000000000000'),
    target: '3zghSGBnHXA2NBikUqBCP18vS5LaNNUnHgJCoi5yatWppZjX',
  },
  {
    amount: BigInt('10000000000000'),
    target: '45yDdYkT4eRWy5GAesXygQAKsotMnvi7GR8YPDimDfeJi6Go',
  },
  {
    amount: BigInt('373000000000000'),
    target: '45yDdYkT4eRWy5GAesXygQAKsotMnvi7GR8YPDimDfeJi6Go',
  },
  {
    amount: BigInt('30000000000000'),
    target: '41mNTZcH7wJqzcR7DYmorZcGK1cn9UJQfcMmp7h82niSV2VZ',
  },
];

const main = async () => {
  // Load Provider
  const apiMB = await ApiPromise.create({
    provider: wsMBProvider,
    noInitWarn: true,
  });
  const apiPHA = await ApiPromise.create({
    provider: wsPHAprovider,
    noInitWarn: true,
  });
  await apiMB.isReady;
  await apiPHA.isReady;

  // Construct AH Call
  let batchCall = [];

  // Loop to go through Tranfer Details
  for (let transfer of transferDetails) {
    batchCall.push(
      await apiPHA.tx.balances.transferKeepAlive({ Id: transfer.target }, transfer.amount)
    );
  }
  let PHATX = await apiPHA.tx.utility.batchAll(batchCall);

  const info = await PHATX.paymentInfo('13cKp89NgPL56sRoVRpBcjkGZPrk4Vf4tS6ePUD96XhAXozG');

  const fallbackWeight = { refTime, proofSize };
  const weightFromInfo =
    info.weight && 'refTime' in info.weight && 'proofSize' in info.weight
      ? {
          // convert BN to BigInt (or string) depending on what your call expects
          refTime: (BigInt(110) * BigInt(info.weight.refTime.toString())) / BigInt(100),
          proofSize: (BigInt(110) * BigInt(info.weight.proofSize.toString())) / BigInt(100),
        }
      : fallbackWeight;

  console.log(info.toHuman());
  console.log({
    weight: {
      refTime: weightFromInfo.refTime.toString(),
      proofSize: weightFromInfo.proofSize.toString(),
    },
  });

  // Build Moonbeam/Moonriver Call
  const destPHA = {
    V5: {
      parents: 1,
      interior: {
        X1: [
          {
            Parachain: 2035,
          },
        ],
      },
    },
  };
  let paraTx = await apiMB.tx.xcmTransactor.transactThroughSovereign(
    destPHA,
    null,
    {
      currency: {
        AsCurrencyId: { ForeignAsset: '132685552157663328694213725410064821485' },
      },
      feeAmount: feeAmount,
    },
    PHATX.method.toHex(),
    'SovereignAccount',
    {
      transactRequiredWeightAtMost: {
        refTime: weightFromInfo.refTime,
        proofSize: weightFromInfo.proofSize,
      },
      overallWeight: 'Unlimited',
    },
    true
  );

  console.log(`Call to refund users`);
  console.log(paraTx.method.toHex());
  await apiMB.disconnect();
  await apiPHA.disconnect();
};

main()
  .catch(console.error)
  .finally(() => process.exit());
