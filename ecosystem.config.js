/**
 * PM2 Ecosystem файл для управления процессами бота
 * 
 * Установка PM2:
 * npm install -g pm2
 * 
 * Запуск:
 * pm2 start ecosystem.config.js
 * 
 * Другие команды:
 * pm2 status         - статус процессов
 * pm2 logs           - логи всех процессов
 * pm2 logs bot       - логи только бота
 * pm2 logs pagekite  - логи только pagekite
 * pm2 restart all    - перезапуск всех процессов
 * pm2 stop all       - остановка всех процессов
 * pm2 delete all     - удаление всех процессов
 */

module.exports = {
  apps: [
    {
      name: 'pagekite',
      script: 'python3',
      args: 'pagekite.py 3000 dashastar.pagekite.me',
      cwd: __dirname,
      interpreter: 'none', // Важно! Указываем что это не Node.js скрипт
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pagekite-error.log',
      out_file: './logs/pagekite-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'bot',
      script: './bot.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false, // В продакшене не нужен watch
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Задержка запуска бота после pagekite
      wait_ready: true,
      listen_timeout: 10000,
      // Автоматический перезапуск при сбое
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};

