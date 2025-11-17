module.exports = {
  apps: [
    {
      name: 'digiens-backend',
      script: './src/server.js',
      instances: 'max', // CPU core sayısı kadar instance
      exec_mode: 'cluster', // Cluster mode
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};

