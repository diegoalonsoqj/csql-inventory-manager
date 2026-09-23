const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'csql-inventory',
      script: path.join(root, 'server/src/app.js'),
      cwd: path.join(root, 'server'),
      interpreter: 'node',
      interpreter_args: [`--env-file=${path.join(root, '.env')}`],
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '256M',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
