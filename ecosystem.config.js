/**
 * PM2 Ecosystem Configuration for Phygital Application
 * 
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js --env production
 *   pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      // Backend Application
      name: 'phygital-backend',
      script: './backend/server.js',
      cwd: '/var/www/phygital',
      
      // Process Management
      instances: 1,
      exec_mode: 'fork',
      
      // Auto Restart Configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
      // Logging
      error_file: '/var/log/phygital/backend-error.log',
      out_file: '/var/log/phygital/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Environment Variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // Advanced Settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Auto-restart on file changes (development only)
      // ignore_watch: ['node_modules', 'logs', 'temp'],
      // watch_options: {
      //   followSymlinks: false
      // }
    }
  ],

  /**
   * Deployment Configuration
   * Uncomment and configure for automated deployments
   */
  // deploy: {
  //   production: {
  //     user: 'phygital',
  //     host: 'your-server-ip',
  //     ref: 'origin/master',
  //     repo: 'git@github.com:username/phygital.git',
  //     path: '/var/www/phygital',
  //     'post-deploy': 'cd backend && npm install --production && cd ../frontend && npm install && npm run build && pm2 reload ecosystem.config.js --env production'
  //   }
  // }
};


