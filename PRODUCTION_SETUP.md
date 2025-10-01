# Настройка бота для продакшена

## 📋 Оглавление

1. [Вариант 1: PM2 (Рекомендуется)](#вариант-1-pm2-рекомендуется)
2. [Вариант 2: Systemd Services](#вариант-2-systemd-services)
3. [Вариант 3: Bash скрипт](#вариант-3-bash-скрипт)
4. [Настройка автозапуска при загрузке системы](#автозапуск-при-загрузке-системы)
5. [Мониторинг и логи](#мониторинг-и-логи)

---

## Требования

### 1. Установленные зависимости
```bash
# Node.js и npm
node --version  # v14+ рекомендуется
npm --version

# Python 3
python3 --version

# Git (опционально)
git --version
```

### 2. PageKite
```bash
# Скачать pagekite.py
cd /path/to/tg_psy_3.0
wget https://pagekite.net/pk/pagekite.py
chmod +x pagekite.py

# Или установить через pip
pip3 install pagekite
```

### 3. Настроить .env
```bash
# Убедитесь что .env настроен
cp env.example .env
nano .env  # Заполните все переменные
```

---

## Вариант 1: PM2 (Рекомендуется)

### ✨ Преимущества PM2:
- ✅ Автоматический перезапуск при сбое
- ✅ Простое управление процессами
- ✅ Встроенный мониторинг
- ✅ Логирование
- ✅ Кластеризация (если нужно)
- ✅ Автозапуск при перезагрузке сервера

### Установка PM2

```bash
# Глобальная установка PM2
npm install -g pm2

# Или через yarn
yarn global add pm2
```

### Настройка

Файл `ecosystem.config.js` уже создан в проекте.

### Запуск

```bash
# Запуск всех процессов
pm2 start ecosystem.config.js

# Или по отдельности
pm2 start ecosystem.config.js --only pagekite
pm2 start ecosystem.config.js --only bot
```

### Управление

```bash
# Статус процессов
pm2 status

# Логи всех процессов
pm2 logs

# Логи конкретного процесса
pm2 logs bot
pm2 logs pagekite

# Перезапуск
pm2 restart all
pm2 restart bot
pm2 restart pagekite

# Остановка
pm2 stop all
pm2 stop bot
pm2 stop pagekite

# Удаление из PM2
pm2 delete all
pm2 delete bot
pm2 delete pagekite

# Мониторинг в реальном времени
pm2 monit
```

### Настройка автозапуска

```bash
# Сохранить текущий список процессов
pm2 save

# Настроить автозапуск при загрузке системы
pm2 startup

# Выполните команду, которую предложит PM2
# Например: sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u your_user --hp /home/your_user
```

### Просмотр логов

```bash
# Логи сохраняются в ./logs/
tail -f logs/bot-out.log      # Вывод бота
tail -f logs/bot-error.log    # Ошибки бота
tail -f logs/pagekite-out.log # Вывод PageKite
tail -f logs/pagekite-error.log # Ошибки PageKite
```

---

## Вариант 2: Systemd Services

### ✨ Преимущества systemd:
- ✅ Нативная интеграция с Linux
- ✅ Надежный автозапуск
- ✅ Централизованное логирование (journald)
- ✅ Управление зависимостями между сервисами

### Установка

#### 1. Настройте service файлы

```bash
# Отредактируйте файлы в директории systemd/
nano systemd/pagekite.service
nano systemd/telegram-bot.service

# Замените:
# - your_user на ваше имя пользователя
# - /path/to/tg_psy_3.0 на полный путь к проекту
```

#### 2. Установите service файлы

```bash
# Скопируйте service файлы в systemd
sudo cp systemd/pagekite.service /etc/systemd/system/
sudo cp systemd/telegram-bot.service /etc/systemd/system/

# Перезагрузите systemd
sudo systemctl daemon-reload
```

#### 3. Включите и запустите сервисы

```bash
# Включить автозапуск
sudo systemctl enable pagekite.service
sudo systemctl enable telegram-bot.service

# Запустить сервисы
sudo systemctl start pagekite.service
sudo systemctl start telegram-bot.service
```

### Управление

```bash
# Статус сервисов
sudo systemctl status pagekite
sudo systemctl status telegram-bot

# Остановка
sudo systemctl stop pagekite
sudo systemctl stop telegram-bot

# Перезапуск
sudo systemctl restart pagekite
sudo systemctl restart telegram-bot

# Отключить автозапуск
sudo systemctl disable pagekite
sudo systemctl disable telegram-bot
```

### Просмотр логов

```bash
# Логи PageKite
sudo journalctl -u pagekite -f

# Логи бота
sudo journalctl -u telegram-bot -f

# Последние 100 строк
sudo journalctl -u telegram-bot -n 100

# Логи за сегодня
sudo journalctl -u telegram-bot --since today
```

---

## Вариант 3: Bash скрипт

### ✨ Преимущества:
- ✅ Простота
- ✅ Не требует дополнительных зависимостей
- ✅ Полный контроль

### Использование

```bash
# Сделать скрипт исполняемым
chmod +x start-production.sh

# Запуск
./start-production.sh start

# Остановка
./start-production.sh stop

# Перезапуск
./start-production.sh restart

# Статус
./start-production.sh status

# Логи
./start-production.sh logs        # Все логи
./start-production.sh logs bot    # Только бот
./start-production.sh logs pagekite # Только PageKite
```

### Просмотр логов в реальном времени

```bash
# Логи бота
tail -f logs/bot.log

# Логи PageKite
tail -f logs/pagekite.log

# Оба одновременно
tail -f logs/*.log
```

---

## Автозапуск при загрузке системы

### Для Bash скрипта (через crontab)

```bash
# Открыть crontab
crontab -e

# Добавить строку (замените путь на ваш):
@reboot /path/to/tg_psy_3.0/start-production.sh start

# Сохранить и выйти
```

### Альтернативно (через rc.local)

```bash
# Отредактировать rc.local
sudo nano /etc/rc.local

# Добавить перед 'exit 0':
su - your_user -c '/path/to/tg_psy_3.0/start-production.sh start'

# Сделать исполняемым
sudo chmod +x /etc/rc.local
```

---

## Мониторинг и логи

### Структура логов

```
logs/
├── bot.log              # Bash скрипт - лог бота
├── pagekite.log         # Bash скрипт - лог PageKite
├── bot-out.log          # PM2 - вывод бота
├── bot-error.log        # PM2 - ошибки бота
├── pagekite-out.log     # PM2 - вывод PageKite
└── pagekite-error.log   # PM2 - ошибки PageKite
```

### Мониторинг работы

#### PM2
```bash
# Dashboard в терминале
pm2 monit

# Веб-интерфейс (опционально)
pm2 install pm2-server-monit
```

#### Systemd
```bash
# Статус всех сервисов
systemctl list-units --type=service --state=running | grep -E 'pagekite|telegram-bot'

# Использование ресурсов
systemctl status pagekite telegram-bot
```

#### Bash скрипт
```bash
# Проверка процессов
ps aux | grep -E 'pagekite|bot.js'

# Использование памяти
./start-production.sh status
```

### Ротация логов

Создайте файл `/etc/logrotate.d/telegram-bot`:

```bash
/path/to/tg_psy_3.0/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 your_user your_user
}
```

---

## Проверка работы

### 1. Проверка PageKite туннеля

```bash
# Проверить что туннель работает
curl https://dashastar.pagekite.me

# Должен вернуть: "Telegram Bot is running!"
```

### 2. Проверка бота

```bash
# Отправить /start боту в Telegram
# Должен ответить приветственным сообщением
```

### 3. Проверка webhook

```bash
# Проверить endpoint webhook
curl https://dashastar.pagekite.me/webhook/prodamus
```

---

## Troubleshooting

### Проблема: PageKite не запускается

```bash
# Проверить что pagekite.py скачан
ls -la pagekite.py

# Скачать если отсутствует
wget https://pagekite.net/pk/pagekite.py
chmod +x pagekite.py

# Проверить Python
python3 --version
```

### Проблема: Бот не запускается

```bash
# Проверить .env
cat .env | grep -v "^#"

# Проверить зависимости
npm install

# Проверить порт
netstat -tulpn | grep 3000
# или
lsof -i :3000
```

### Проблема: Webhook не работает

```bash
# Проверить что сервер доступен
curl https://dashastar.pagekite.me

# Проверить логи Prodamus webhook
# в логах бота должны быть записи "Prodamus webhook received"
```

### Проблема: Процессы не останавливаются

```bash
# PM2
pm2 kill

# Systemd
sudo systemctl stop pagekite telegram-bot

# Bash скрипт
pkill -f pagekite.py
pkill -f bot.js
```

---

## Рекомендации для продакшена

### Безопасность

1. **Не коммитьте .env в git**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Ограничьте доступ к файлам**
   ```bash
   chmod 600 .env
   chmod 700 start-production.sh
   ```

3. **Используйте firewall**
   ```bash
   # Разрешить только необходимые порты
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```

### Производительность

1. **Мониторинг ресурсов**
   ```bash
   # Установить htop
   sudo apt install htop
   htop
   ```

2. **Настроить swap (если мало RAM)**
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Резервное копирование

```bash
# Создать скрипт backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backup/tg_bot_$DATE.tar.gz \
    /path/to/tg_psy_3.0/bot.db \
    /path/to/tg_psy_3.0/.env \
    /path/to/tg_psy_3.0/logs/

# Запускать через cron каждый день
0 3 * * * /path/to/backup.sh
```

---

## Сравнение вариантов

| Критерий | PM2 | Systemd | Bash |
|----------|-----|---------|------|
| Простота установки | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Надежность | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Мониторинг | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| Логи | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Автозапуск | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Кросс-платформенность | ⭐⭐⭐ | ⭐ | ⭐⭐ |

### Рекомендация:
- **PM2** - лучший выбор для большинства случаев
- **Systemd** - если важна нативная интеграция с Linux
- **Bash** - для простых случаев или когда нельзя устанавливать PM2

---

## Быстрый старт

### С PM2:
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### С Systemd:
```bash
# Отредактируйте файлы в systemd/
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pagekite telegram-bot
sudo systemctl start pagekite telegram-bot
```

### С Bash:
```bash
chmod +x start-production.sh
./start-production.sh start
```

---

**Готово! Бот работает в продакшене! 🚀**

