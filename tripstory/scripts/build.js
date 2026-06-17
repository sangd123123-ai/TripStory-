const { spawnSync } = require('child_process');
const path = require('path');

const reactScripts = require.resolve('react-scripts/bin/react-scripts');
const existingNodeOptions = process.env.NODE_OPTIONS || '';
const legacyProvider = '--openssl-legacy-provider';

const env = {
  ...process.env,
  CI: 'false',
  NODE_OPTIONS: existingNodeOptions.includes(legacyProvider)
    ? existingNodeOptions
    : `${existingNodeOptions} ${legacyProvider}`.trim(),
};

const result = spawnSync(process.execPath, [reactScripts, 'build'], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
