// PM2配置文件
// 使用方法: pm2 start pm2.config.js

module.exports = {
  apps: [
    {
      name: 'personal-web-api',
      script: 'uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      interpreter: '/www/wwwroot/personal-web/.venv/bin/python',
      cwd: '/www/wwwroot/personal-web',
      instances: 2, // 根据CPU核心数调整，建议为CPU核心数
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PYTHONUNBUFFERED: '1'
      },
      error_file: '/www/wwwroot/personal-web/logs/pm2-error.log',
      out_file: '/www/wwwroot/personal-web/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git']
    }
  ]
};

// 如果使用Gunicorn，可以使用以下配置：
/*
module.exports = {
  apps: [
    {
      name: 'personal-web-api',
      script: 'gunicorn',
      args: '-w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 app.main:app',
      interpreter: '/www/wwwroot/personal-web/.venv/bin/python',
      cwd: '/www/wwwroot/personal-web',
      env: {
        NODE_ENV: 'production',
        PYTHONUNBUFFERED: '1'
      },
      error_file: '/www/wwwroot/personal-web/logs/pm2-error.log',
      out_file: '/www/wwwroot/personal-web/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false
    }
  ]
};
*/

