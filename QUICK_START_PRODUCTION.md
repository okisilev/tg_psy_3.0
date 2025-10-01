# 🚀 Быстрый старт в продакшене

## Вариант 1: PM2 (Рекомендуется) ⭐

### За 3 команды:

```bash
# 1. Установить PM2
npm install -g pm2

# 2. Запустить бота
pm2 start ecosystem.config.js

# 3. Настроить автозапуск
pm2 save && pm2 startup
```

### Управление:

```bash
pm2 status          # Статус
pm2 logs            # Логи
pm2 restart all     # Перезапуск
pm2 stop all        # Остановка
pm2 monit           # Мониторинг
```

---

## Вариант 2: Bash скрипт (Простой)

### Запуск:

```bash
# Сделать исполняемым (только первый раз)
chmod +x start-production.sh

# Запустить
./start-production.sh start
```

### Управление:

```bash
./start-production.sh status    # Статус
./start-production.sh restart   # Перезапуск
./start-production.sh stop      # Остановка
./start-production.sh logs      # Логи
```

---

## Вариант 3: Systemd (Для Linux серверов)

### Настройка:

```bash
# 1. Отредактировать файлы (замените пути и пользователя)
nano systemd/pagekite.service
nano systemd/telegram-bot.service

# 2. Установить
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# 3. Включить и запустить
sudo systemctl enable pagekite telegram-bot
sudo systemctl start pagekite telegram-bot
```

### Управление:

```bash
sudo systemctl status telegram-bot    # Статус
sudo systemctl restart telegram-bot   # Перезапуск
sudo journalctl -u telegram-bot -f    # Логи
```

---

## Перед запуском проверьте:

- ✅ Установлен Node.js
- ✅ Установлен Python 3
- ✅ Скачан `pagekite.py`
- ✅ Настроен файл `.env`
- ✅ Выполнен `npm install`
- ✅ Запущена миграция БД: `node migration-add-is-banned.js`

---

## Проверка работы:

```bash
# 1. Проверить туннель
curl https://dashastar.pagekite.me
# Должно вернуть: "Telegram Bot is running!"

# 2. Проверить бота в Telegram
# Отправьте /start боту

# 3. Проверить логи
# PM2:
pm2 logs bot

# Bash:
tail -f logs/bot.log

# Systemd:
sudo journalctl -u telegram-bot -f
```

---

## Автозапуск при загрузке сервера:

### PM2:
```bash
pm2 save
pm2 startup
# Выполните команду которую предложит PM2
```

### Bash (через crontab):
```bash
crontab -e
# Добавьте:
@reboot /полный/путь/к/start-production.sh start
```

### Systemd:
```bash
# Уже настроено если использовали enable
sudo systemctl enable pagekite telegram-bot
```

---

## Полная документация:

📚 `PRODUCTION_SETUP.md` - детальная инструкция со всеми вариантами

---

**Готово! 🎉 Бот работает в продакшене!**

