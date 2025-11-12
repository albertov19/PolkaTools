/*
  Refund deposits for APPROVED or CANCELLED referenda only.
  Usage:
    npx ts-node batchRefundRefDeposits.ts -n moonbeam
    npx ts-node batchRefundRefDeposits.ts -n moonriver
    npx ts-node batchRefundRefDeposits.ts -n wss://your.custom.node:9944
*/

import { ApiPromise, WsProvider } from '@polkadot/api';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv)).options({
  network: { type: 'string', demandOption: true, alias: 'n', default: 'moonbeam' },
}).argv as unknown as { network: string };

function makeProvider(network: string): WsProvider {
  if (network === 'moonbeam') return new WsProvider('wss://wss.api.moonbeam.network');
  if (network === 'moonriver') return new WsProvider('wss://wss.api.moonriver.moonbeam.network');
  return new WsProvider(network);
}

// Option-like runtime shape
type OptionLike<T = unknown> = {
  isSome: boolean;
  isNone: boolean;
  unwrap: () => T;
  toHuman?: () => any;
};

// Deposit detector (works for Option<Deposit> or toHuman() objects)
function hasDeposit(maybe: any): boolean {
  if (!maybe) return false;
  if (typeof maybe === 'object') {
    if ('isSome' in maybe) return Boolean((maybe as any).isSome);
    if ('who' in maybe || 'amount' in maybe) return true;
  }
  return false;
}

const main = async () => {
  const api = await ApiPromise.create({ provider: makeProvider(argv.network), noInitWarn: true });
  await api.isReady;

  const entries = await api.query.referenda.referendumInfoFor.entries();

  type Plan = { refId: number; refundSubmission: boolean; refundDecision: boolean; status: 'Approved'|'Cancelled' };
  const plans: Plan[] = [];

  for (const [key, codec] of entries as unknown as [any, any][]) {
    const refId = (key.args?.[0] as any)?.toNumber?.() ?? Number(key.args?.[0]);

    const optInfo = codec as OptionLike<any>;
    if (!optInfo.isSome) continue;

    const info = optInfo.unwrap() as any;

    // Only consider Approved or Cancelled
    const isApproved = !!info?.isApproved;
    const isCancelled = !!info?.isCancelled;
    if (!isApproved && !isCancelled) continue;

    // Grab the variant payload
    let variant: any;
    try {
      variant = isApproved ? info.asApproved : info.asCancelled;
    } catch {
      variant = undefined;
    }

    // Extract deposits: prefer named fields; fall back to tuple-like or toHuman()
    let submissionDeposit: any;
    let decisionDeposit: any;

    if (variant) {
      submissionDeposit = variant.submissionDeposit ?? variant[1];
      decisionDeposit   = variant.decisionDeposit   ?? variant[2];
    } else {
      const h = info?.toHuman?.();
      const arr = h?.Approved ?? h?.Cancelled;
      if (Array.isArray(arr)) {
        submissionDeposit = arr[1];
        decisionDeposit   = arr[2];
      }
    }

    const refundSubmission = hasDeposit(submissionDeposit);
    const refundDecision = hasDeposit(decisionDeposit);

    if (refundSubmission || refundDecision) {
      plans.push({ refId, refundSubmission, refundDecision, status: isApproved ? 'Approved' : 'Cancelled' });
    }
  }

  console.log(`Referenda with refundable deposits (Approved/Cancelled): ${plans.length}`);
  if (plans.length === 0) {
    console.log('Nothing to refund. Exiting.');
    await api.disconnect();
    return;
  }

  // Build calls
  const calls: any[] = [];
  for (const p of plans) {
    if (p.refundSubmission && api.tx.referenda.refundSubmissionDeposit) {
      calls.push(api.tx.referenda.refundSubmissionDeposit(p.refId));
    }
    if (p.refundDecision && api.tx.referenda.refundDecisionDeposit) {
      calls.push(api.tx.referenda.refundDecisionDeposit(p.refId));
    }
  }

  if (calls.length === 0) {
    console.log('No refund calls ended up in the batch. Exiting.');
    await api.disconnect();
    return;
  }

  // Always use utility.batch
  const batch = api.tx.utility.batch(calls);

  // Preview with proper labels
  console.log('\nPlanned calls:');
  for (const c of calls) {
    const call = c.method as any; // Call
    console.log(`${call.section}.${call.method}(${call.args.map((a: any) => a.toString()).join(', ')})`);
  }

  console.log('\nBatch hex:');
  console.log(batch.toHex());

  await api.disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
