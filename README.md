# 🤖 Telegram Bot для платного доступа к закрытому сообществу

Профессиональный Telegram бот для монетизации закрытых каналов и групп через автоматические платежи Prodamus.

## ✨ Возможности

### 💰 Платежи
- 🔗 Автоматическое создание платежных ссылок через Prodamus
- 💳 Обработка webhook уведомлений об оплате в реальном времени
- 🔒 Защищенная проверка подписи webhook
- 💵 Настраиваемая стоимость подписки (по умолчанию 2000₽)

### 👥 Управление пользователями
- ✅ Автоматическое предоставление доступа после оплаты
- 🔄 **Мягкое удаление** - пользователи остаются в сообществе при истечении подписки
- 🎯 **Автоматическое восстановление** доступа при повторной оплате
- 📅 Подписка на 30 дней с автоматическим контролем
- 🔔 Уведомления за 3 дня до истечения подписки
- 📊 Полная история действий в логах

### 🏢 Поддержка разных типов чатов
- 📢 **Каналы** - для односторонней коммуникации
- 💬 **Группы** - для живого общения участников
- 🔥 **Супергруппы** - до 200,000 участников

### 🎨 Интерфейс
- 📱 Удобные inline-кнопки
- 👤 Кнопка для индивидуальной консультации через WhatsApp
- 🔗 Автоматическая генерация invite-ссылок
- 📊 Админ-панель со статистикой

### 🗄️ База данных
- 💾 SQLite с автоматической инициализацией
- 📈 Хранение пользователей, платежей, подписок
- 🔍 Логирование всех операций
- 🔄 Миграции для обновлений

---

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
# Клонировать репозиторий (если еще не сделано)
git clone <your-repo-url>
cd tg_psy_3.0

# Установить зависимости
npm install
```

### 2. Настройка конфигурации

```bash
# Создать .env из примера
cp env.example .env

# Отредактировать .env
nano .env
```

**Основные параметры `.env`:**
```env
# Telegram
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz  # От @BotFather
TELEGRAM_CHANNEL_ID=-1001234567890                        # ID канала/группы
TELEGRAM_PERMANENT_INVITE_LINK=                           # Опционально

# Prodamus
PRODAMUS_SECRET_KEY=your_secret_key                       # Из кабинета Prodamus
PRODAMUS_LINK_TO_FORM=https://your-shop.prod.us          # Ссылка на форму оплаты
PRODAMUS_WEBHOOK_URL=https://yourname.pagekite.me/webhook/prodamus

# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_PATH=./bot.db
```

### 3. Настройка Telegram

#### A. Создайте бота
1. Напишите [@BotFather](https://t.me/BotFather)
2. Создайте нового бота: `/newbot`
3. Скопируйте токен в `TELEGRAM_BOT_TOKEN`

#### B. Получите ID канала/группы
1. Добавьте [@userinfobot](https://t.me/userinfobot) в ваш канал/группу
2. Отправьте сообщение в канал/группу
3. Бот покажет ID (например: `-1001234567890`)
4. Скопируйте ID в `TELEGRAM_CHANNEL_ID`

#### C. Добавьте бота как администратора
1. Откройте настройки канала/группы
2. Добавьте вашего бота
3. Сделайте администратором с правом **"Приглашать пользователей"**

### 4. Настройка Prodamus

1. Зарегистрируйтесь на [Prodamus](https://prodamus.ru)
2. Создайте магазин и форму оплаты
3. В настройках получите **Secret Key**
4. Настройте webhook: `https://yourname.pagekite.me/webhook/prodamus`

📚 Подробнее: [docs/PRODAMUS_SETUP.md](docs/PRODAMUS_SETUP.md)

### 5. Настройка PageKite (туннель для webhook)

```bash
# Скачать PageKite
wget https://pagekite.net/pk/pagekite.py
chmod +x pagekite.py

# Запустить туннель (в отдельном терминале)
python3 pagekite.py 3000 yourname.pagekite.me
```

### 6. Запуск миграции базы данных

```bash
# Добавить поле is_banned для мягкого удаления
npm run migrate
```

### 7. Запуск бота

```bash
# Разработка
npm run dev

# Продакшен
npm start
```

✅ **Готово!** Отправьте `/start` вашему боту в Telegram

---

## 🎯 Продакшен

### Вариант 1: PM2 (Рекомендуется) ⭐

**Автоматически запускает PageKite + Bot с мониторингом:**

```bash
# Установить PM2
npm install -g pm2

# Запустить оба процесса
npm run pm2:start

# Сохранить конфигурацию
pm2 save

# Настроить автозапуск при загрузке сервера
pm2 startup
# Выполните команду которую предложит PM2

# Управление
pm2 status          # Статус
pm2 logs            # Логи
pm2 restart all     # Перезапуск
pm2 monit           # Мониторинг
```

### Вариант 2: Systemd (Linux)

```bash
# Настройте service файлы
nano systemd/pagekite.service
nano systemd/telegram-bot.service

# Установите
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pagekite telegram-bot
sudo systemctl start pagekite telegram-bot
```

### Вариант 3: Bash скрипт

```bash
# Запуск
npm run production

# Управление
npm run production:status
npm run production:logs
npm run production:restart
npm run production:stop
```

📚 **Полная документация:** [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)  
🚀 **Быстрый старт:** [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md)

---

## 📋 Структура проекта

```
tg_psy_3.0/
├── bot.js                      # Основной файл бота
├── config.js                   # Конфигурация из .env
├── Hmac.js                     # Проверка подписи Prodamus
├── package.json                # Зависимости и скрипты
├── ecosystem.config.js         # Конфигурация PM2
├── start-production.sh         # Bash скрипт для запуска
├── migration-add-is-banned.js  # Миграция БД
│
├── services/
│   ├── databaseService.js      # Работа с SQLite
│   └── prodamusService.js      # API Prodamus
│
├── systemd/
│   ├── pagekite.service        # Systemd service для PageKite
│   └── telegram-bot.service    # Systemd service для бота
│
├── docs/                       # Документация
│   ├── PRODAMUS_SETUP.md
│   ├── SOFT_DELETE_IMPLEMENTATION.md
│   └── ...
│
├── logs/                       # Логи (создается автоматически)
│   ├── bot-out.log
│   ├── bot-error.log
│   ├── pagekite-out.log
│   └── pagekite-error.log
│
└── bot.db                      # База данных SQLite
```

---

## 💾 База данных

### Таблица `users`
```sql
- id              INTEGER PRIMARY KEY
- telegram_id     INTEGER UNIQUE
- username        TEXT
- first_name      TEXT
- last_name       TEXT
- has_access      BOOLEAN DEFAULT FALSE
- is_banned       BOOLEAN DEFAULT FALSE  -- Мягкое удаление
- created_at      DATETIME
- updated_at      DATETIME
```

### Таблица `payments`
```sql
- id              INTEGER PRIMARY KEY
- telegram_id     INTEGER
- order_id        TEXT UNIQUE
- order_num       TEXT
- amount          REAL
- status          TEXT
- payment_status  TEXT
- customer_email  TEXT
- customer_phone  TEXT
- created_at      DATETIME
```

### Таблица `subscriptions`
```sql
- id              INTEGER PRIMARY KEY
- telegram_id     INTEGER
- payment_id      INTEGER
- start_date      DATETIME
- end_date        DATETIME
- is_active       BOOLEAN DEFAULT TRUE
- created_at      DATETIME
```

### Таблица `logs`
```sql
- id              INTEGER PRIMARY KEY
- telegram_id     INTEGER
- action          TEXT
- details         TEXT
- created_at      DATETIME
```

---

## 🎮 Команды бота

### Пользовательские команды:
- `/start` - Начало работы и показ меню

### Кнопки интерфейса:
- 💳 **Оплатить** - Создание ссылки на оплату (2000₽)
- 👤 **Индивидуальная консультация** - Переход в WhatsApp
- ❓ **Помощь** - Справка по использованию
- ✅ **Проверить оплату** - Проверка статуса платежа
- 🔄 **Продлить подписку** - Для истекающих подписок

---

## 🔄 Система подписок

### Жизненный цикл подписки:

```
1. Оплата 2000₽
   ↓
2. Создание подписки на 30 дней
   ↓
3. Отправка invite-ссылки
   ↓
4. За 3 дня до истечения: уведомление
   ↓
5. Истечение подписки:
   → Мягкое удаление (is_banned = TRUE)
   → Уведомление с предложением продлить
   ↓
6. При повторной оплате:
   → Автоматическое восстановление
   → Новая подписка на 30 дней
```

### Мягкое удаление

**Преимущества:**
- ✅ Пользователь остается в канале/группе
- ✅ Сохраняется история сообщений
- ✅ Простое восстановление при оплате
- ✅ Нет риска блокировки бота

**Как работает:**
- При истечении подписки пользователь помечается в БД как `is_banned = TRUE`
- Физически из канала/группы не удаляется
- При повторной оплате флаг автоматически снимается

📚 **Подробнее:** [docs/SOFT_DELETE_IMPLEMENTATION.md](docs/SOFT_DELETE_IMPLEMENTATION.md)

---

## 🛠️ API Endpoints

### `POST /webhook/prodamus`
Принимает уведомления от Prodamus об оплате

**Request:**
```json
{
  "order_id": "unique_order_id",
  "order_num": "tg_123456789_timestamp",
  "sum": "2000.00",
  "payment_status": "success",
  "customer_email": "user@example.com"
}
```

**Response:**
- `200 OK` - Успешно обработано
- `400 Bad Request` - Неверная подпись или данные
- `500 Internal Server Error` - Ошибка сервера

### `GET /`
Проверка работы сервера

**Response:**
```
Telegram Bot is running!
```

---

## 📊 Мониторинг

### Статус процессов

**PM2:**
```bash
pm2 status
pm2 monit
```

**Systemd:**
```bash
sudo systemctl status telegram-bot pagekite
```

**Bash:**
```bash
npm run production:status
```

### Просмотр логов

**PM2:**
```bash
pm2 logs bot        # Логи бота
pm2 logs pagekite   # Логи PageKite
pm2 logs            # Все логи
```

**Systemd:**
```bash
sudo journalctl -u telegram-bot -f
sudo journalctl -u pagekite -f
```

**Bash:**
```bash
npm run production:logs
tail -f logs/bot.log
tail -f logs/pagekite.log
```

### SQL запросы для мониторинга

```bash
# Подключиться к БД
sqlite3 bot.db

# Статистика
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM users WHERE has_access = TRUE;
SELECT COUNT(*) FROM subscriptions WHERE is_active = TRUE;

# Истекающие подписки (ближайшие 3 дня)
SELECT u.telegram_id, u.username, s.end_date 
FROM users u 
JOIN subscriptions s ON u.telegram_id = s.telegram_id 
WHERE s.is_active = TRUE 
AND DATE(s.end_date) <= DATE('now', '+3 days');

# Пользователи с мягким удалением
SELECT telegram_id, username, is_banned, updated_at 
FROM users 
WHERE is_banned = TRUE;
```

---

## 🔒 Безопасность

### Реализованные меры:
- ✅ Проверка HMAC подписи webhook от Prodamus
- ✅ Валидация всех входящих данных
- ✅ Ограничение времени действия платежных ссылок (24 часа)
- ✅ Защита .env файла (в .gitignore)
- ✅ Логирование всех операций

### Рекомендации:
```bash
# Ограничить доступ к .env
chmod 600 .env

# Настроить firewall
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Регулярное резервное копирование БД
tar -czf backup_$(date +%Y%m%d).tar.gz bot.db .env
```

---

## 🧪 Тестирование

### Проверка работы бота

```bash
# 1. Проверить что сервер запущен
curl http://localhost:3000
# Должно вернуть: "Telegram Bot is running!"

# 2. Проверить туннель PageKite
curl https://yourname.pagekite.me
# Должно вернуть: "Telegram Bot is running!"

# 3. Отправить /start боту в Telegram
# Должен ответить приветственным сообщением

# 4. Проверить создание платежной ссылки
# Нажать "Оплатить" - должна создаться ссылка
```

### Тестовый платеж

1. Используйте тестовые карты Prodamus
2. Проверьте что webhook приходит
3. Убедитесь что пользователь получил доступ

---

## 📚 Документация

### Основная документация:
- 🚀 [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md) - Быстрый старт
- 📖 [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) - Детальная настройка продакшена
- 📊 [PRODUCTION_SUMMARY.md](PRODUCTION_SUMMARY.md) - Сводка по продакшену

### Специализированная документация:
- 🔄 [docs/SOFT_DELETE_IMPLEMENTATION.md](docs/SOFT_DELETE_IMPLEMENTATION.md) - Мягкое удаление
- 💳 [docs/PRODAMUS_SETUP.md](docs/PRODAMUS_SETUP.md) - Настройка Prodamus
- 💬 [TELEGRAM_GROUP_SETUP.md](TELEGRAM_GROUP_SETUP.md) - Работа с группами
- 📋 [GROUP_SUPPORT_SUMMARY.md](GROUP_SUPPORT_SUMMARY.md) - Поддержка групп

---

## 🔧 Troubleshooting

### Бот не запускается

```bash
# Проверить .env
cat .env

# Проверить зависимости
npm install

# Проверить порт
lsof -i :3000
```

### Webhook не приходит

```bash
# Проверить доступность
curl https://yourname.pagekite.me/webhook/prodamus

# Проверить что PageKite запущен
ps aux | grep pagekite

# Проверить логи
tail -f logs/bot.log
```

### Пользователь не получает доступ

```bash
# Проверить в БД
sqlite3 bot.db "SELECT * FROM users WHERE telegram_id = 123456789"
sqlite3 bot.db "SELECT * FROM subscriptions WHERE telegram_id = 123456789"

# Проверить что бот админ канала
# Telegram → Настройки канала → Администраторы

# Проверить права бота
# Должно быть: "Приглашать пользователей"
```

### Миграция БД не работает

```bash
# Запустить вручную
node migration-add-is-banned.js

# Проверить структуру
sqlite3 bot.db "PRAGMA table_info(users);"

# Должно быть поле is_banned
```

---

## 🛠️ NPM скрипты

```bash
npm start              # Запуск бота
npm run dev            # Разработка (с nodemon)
npm run migrate        # Миграция БД

# PM2
npm run pm2:start      # Запуск через PM2
npm run pm2:stop       # Остановка PM2
npm run pm2:restart    # Перезапуск PM2
npm run pm2:logs       # Логи PM2
npm run pm2:monit      # Мониторинг PM2

# Продакшен (bash)
npm run production         # Запуск
npm run production:stop    # Остановка
npm run production:restart # Перезапуск
npm run production:status  # Статус
npm run production:logs    # Логи
```

---

## 📈 Статистика и аналитика

### Получение статистики

```javascript
// В боте доступны методы:
await this.getStats();
await this.listChannelUsers();
```

### SQL запросы

```sql
-- Общая статистика
SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN has_access = TRUE THEN 1 ELSE 0 END) as active_users,
    SUM(CASE WHEN is_banned = TRUE THEN 1 ELSE 0 END) as banned_users
FROM users;

-- Статистика платежей
SELECT 
    COUNT(*) as total_payments,
    SUM(CASE WHEN payment_status = 'success' THEN 1 ELSE 0 END) as success,
    SUM(CASE WHEN payment_status = 'success' THEN amount ELSE 0 END) as revenue
FROM payments;

-- Новые пользователи за сегодня
SELECT COUNT(*) 
FROM users 
WHERE DATE(created_at) = DATE('now');

-- Истекающие подписки (следующие 7 дней)
SELECT COUNT(*) 
FROM subscriptions 
WHERE is_active = TRUE 
AND DATE(end_date) BETWEEN DATE('now') AND DATE('now', '+7 days');
```

---

## 🌟 Особенности

### Автоматические процессы:
- ⏰ Проверка истекающих подписок каждые 6 часов
- 🔔 Уведомления за 3 дня до истечения
- 🔄 Автоматическая деактивация истекших подписок
- 💾 Логирование всех операций

### Настраиваемые параметры:
- 💵 Стоимость подписки (по умолчанию 2000₽)
- ⏱️ Срок подписки (по умолчанию 30 дней)
- 📧 Контакты поддержки
- 🔗 Ссылка на форму оплаты

---

## 🤝 Поддержка

### Контакты:
- 📞 Telegram: @Fun_Oleg
- 💬 WhatsApp: +79025158278

### Полезные ссылки:
- [Документация Telegram Bot API](https://core.telegram.org/bots/api)
- [Документация Prodamus](https://help.prodamus.ru)
- [Документация PageKite](https://pagekite.net/support/)

---

## 📝 Лицензия

MIT License - см. [LICENSE](LICENSE)

---

## 🎉 Готово!

Бот настроен и готов к работе! 🚀

**Следующие шаги:**
1. ✅ Запустите миграцию: `npm run migrate`
2. ✅ Настройте продакшен: см. [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)
3. ✅ Протестируйте оплату
4. ✅ Настройте мониторинг

**Успешного запуска! 💪**
