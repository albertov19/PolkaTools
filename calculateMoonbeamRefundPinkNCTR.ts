import { ApiPromise, WsProvider } from '@polkadot/api';

// Create Provider
let wsMBProvider = new WsProvider('wss://wss.api.moonbeam.network');
let wsAHprovider = new WsProvider('wss://asset-hub-polkadot-rpc.dwellir.com');

// Tx Fee Items
let feeAmount = BigInt(1000000000);
let refTime = BigInt(3000000000);
let proofSize = BigInt(50000);

// Transfer Details:
const transferDetails = [
  {
    token: 23,
    name: 'PINK',
    amount: BigInt('1212613720000000'),
    target: '1yLH66VzPHcJz2uAtBrsL7cXtxZkSRTdHErVy1TWEnSs2wz',
  },
  {
    token: 23,
    name: 'PINK',
    amount: BigInt('10000000000'),
    target: '15BFZxNM6vGErqqkXTmXAkQeifXvFeu9o2CuDVDerjAQbdLK',
  },
  {
    token: 23,
    name: 'PINK',
    amount: BigInt('6967790000000'),
    target: '12UAm1E7fqzZTSeo1GEjxCfWxGBNHUmfVY5XjSAxe4M5i7EY',
  },
  {
    token: 1024,
    name: 'NCTR',
    amount: BigInt('4187000000000000000000'),
    target: '14QYrwn9eVYwRLMzLfoZ3MSw68rTvEYBjMBVCAHeQ1aTig2F',
  },
];

const main = async () => {
  // Load Provider
  const apiMB = await ApiPromise.create({
    provider: wsMBProvider,
    noInitWarn: true,
  });
  const apiAH = await ApiPromise.create({
    provider: wsAHprovider,
    noInitWarn: true,
  });
  await apiMB.isReady;
  await apiAH.isReady;

  // Construct AH Call
  let batchCall = [];

  // Loop to go through Tranfer Details
  for (let transfer of transferDetails) {
    batchCall.push(
      await apiAH.tx.assets.transfer(transfer.token, { Id: transfer.target }, transfer.amount)
    );
  }
  let AHTX = await apiAH.tx.utility.batchAll(batchCall);

  console.log(
    (await AHTX.paymentInfo('13cKp89NgPL56sRoVRpBcjkGZPrk4Vf4tS6ePUD96XhAXozG')).toHuman()
  );

  // Build Moonbeam/Moonriver Call
  const destAH = {
    V4: {
      parents: 1,
      interior: {
        X1: [
          {
            Parachain: 1000,
          },
        ],
      },
    },
  };
  let paraTx = await apiMB.tx.xcmTransactor.transactThroughSovereign(
    destAH,
    null,
    {
      currency: {
        AsCurrencyId: { ForeignAsset: '42259045809535163221576417993425387648' },
      },
      feeAmount: feeAmount,
    },
    AHTX.method.toHex(),
    'SovereignAccount',
    {
      transactRequiredWeightAtMost: { refTime: refTime, proofSize: proofSize },
      overallWeight: 'Unlimited',
    },
    true
  );

  console.log(`Call to refund users`);
  console.log(paraTx.method.toHex());
  await apiMB.disconnect();
  await apiAH.disconnect();
};

main()
  .catch(console.error)
  .finally(() => process.exit());
