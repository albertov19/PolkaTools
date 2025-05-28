import { spawn } from 'child_process';
import path from 'path';
import yargs from 'yargs';

// ✅ Fix: "boolean" instead of "bolean"
const args = yargs.options({
  price: { type: 'number', demandOption: true, alias: 'p' },
  date: { type: 'string', demandOption: false, alias: 'd' },
  chopsticks: { type: 'boolean', demandOption: false, nargs: 0, alias: 'c' },
}).argv as any;

// Data setup
const curators = ['Taylor', 'Alberto', 'Bryan', 'cl0w', 'Pierre', 'Vince'];
const curatorAddresses = [
  '15aSnCUARuwBoLYn6nkFj5ap2DUfRmKcXJaAotfVwvVQxNK3',
  '16AhqStFQa8GrffE7WapHrUQ29dmioZHuwFTn4z9fQ7WBGBZ',
  '14DsLzVyTUTDMm2eP3czwPbH53KgqnQRp3CJJZS9GR7yxGDP',
  '15BERoWxrWC61cAb4JjpUdM7sy8FAS9uduismDbZ7PURZLto',
  '14Pn8sUxdEMgFRDgZ5J2VfcUVMLaMQhst9XuvCj9mKJYUAN2',
  '1brScQ9KDuFB2EsBc93smHY5T464gjWzzvtnJbBwKofTqad',
];

// Computed values
const valueUSD = 3000;
const value = Math.round((valueUSD / args['price']) * 10) * 10 ** 9; // Convert to Planck
const curatorTags = curators.map(curator => `${curator}-${args['date']}`);
const scriptPath = path.resolve(__dirname, 'PALTxGenerator.ts');

// ✅ Dynamically build args array
const cliArgs = [
  scriptPath,
  '--add',
  `${value},${value},${value},${value},${value},${value}`,
  `${curatorTags.join(',')}`,
  '--beneficiaries',
  curatorAddresses.join(','),
  '--propose',
  '',
  '--accept',
  '',
  '--award',
  '',
  '--claim',
  '',
];

// ✅ Conditionally add --chopsticks if present
if (args['chopsticks']) {
  cliArgs.push('--chopsticks');
}

// ✅ Spawn child process
const child = spawn('ts-node', cliArgs, {
  stdio: 'inherit',
});
