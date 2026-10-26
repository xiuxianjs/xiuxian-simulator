module.exports = {
  apps: [
    {
      name: 'alemonx-xiuxian-game-1fb33779',
      namespace: 'alemonx',
      cwd: __dirname,
      script: './index.js',
      autorestart: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,
      exp_backoff_restart_delay: 1000,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
