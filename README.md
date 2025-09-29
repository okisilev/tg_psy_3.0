# Telegram Bot для доступа к закрытому каналу через Prodamus

Telegram бот, который предоставляет доступ к закрытому каналу после успешной оплаты через платежную систему Prodamus.

## Возможности

- 🤖 Автоматическое создание платежных ссылок через Prodamus API
- 💳 Обработка webhook уведомлений об оплате
- 🔐 Автоматическое предоставление доступа к каналу после оплаты
- 📊 Ведение базы данных пользователей и платежей
- 🔒 Проверка подписи webhook для безопасности
- 📱 Удобный интерфейс с inline-кнопками

## Установка

### 1. Клонирование и установка зависимостей

```bash
# Установка зависимостей
npm install
```

### 2. Настройка переменных окружения

Скопируйте файл `env.example` в `.env` и заполните необходимые параметры:

```bash
cp env.example .env
```

Отредактируйте файл `.env`:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHANNEL_ID=@your_channel_username

# Prodamus Configuration
PRODAMUS_SECRET_KEY=your_prodamus_secret_key_here
PRODAMUS_LINK_TO_FORM=https://your-prodamus-form-link.com
PRODAMUS_WEBHOOK_URL=https://your-domain.com/webhook/prodamus

# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./bot.db
```
Запустить в отдельном окне терминала Python
1. pyton -m venv .venv
2. ./venv/bin/activate
3. curl -O https://pagekite.net/pk/pagekite.py
4. python3 pagekite.py 3000 yourname.pagekite.me

### 3. Получение необходимых данных

#### Telegram Bot Token
1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Укажите токен в `TELEGRAM_BOT_TOKEN`

#### Telegram Channel ID
1. Создайте канал в Telegram
2. Добавьте бота в канал как администратора
3. Укажите ID канала в `TELEGRAM_CHANNEL_ID` (например: `@your_channel` или `-1001234567890`)

#### Prodamus настройки
1. Зарегистрируйтесь на [Prodamus](https://prodamus.ru)
2. Создайте платежную форму
3. Получите секретный ключ и ссылку на форму
4. Укажите webhook URL в настройках Prodamus: `https://your-domain.com/webhook/prodamus`

## Запуск

### Разработка
```bash
npm run dev
```

### Продакшн
```bash
npm start
```

## Структура проекта

```
tg_psy_3.0/
├── bot.js                 # Основной файл бота
├── config.js              # Конфигурация
├── Hmac.js                # Библиотека для работы с подписями
├── package.json           # Зависимости проекта
├── env.example            # Пример переменных окружения
├── services/
│   ├── prodamusService.js # Сервис для работы с Prodamus API
│   └── databaseService.js # Сервис для работы с базой данных
└── README.md              # Документация
```

## API Endpoints

### Webhook для Prodamus
- **URL**: `/webhook/prodamus`
- **Method**: POST
- **Описание**: Получает уведомления об оплате от Prodamus

### Главная страница
- **URL**: `/`
- **Method**: GET
- **Описание**: Проверка работы сервера

## Команды бота

- `/start` - Начало работы с ботом
- Кнопка "Оплатить" - Создание платежной ссылки
- Кнопка "Проверить оплату" - Проверка статуса платежа
- Кнопка "Помощь" - Справка по использованию

## База данных

Бот использует SQLite для хранения данных:

### Таблица `users`
- `id` - Уникальный ID
- `telegram_id` - ID пользователя в Telegram
- `username` - Имя пользователя
- `first_name` - Имя
- `last_name` - Фамилия
- `has_access` - Есть ли доступ к каналу
- `created_at` - Дата создания
- `updated_at` - Дата обновления

### Таблица `payments`
- `id` - Уникальный ID
- `telegram_id` - ID пользователя в Telegram
- `order_id` - ID заказа в Prodamus
- `amount` - Сумма платежа
- `status` - Статус платежа
- `created_at` - Дата создания

### Таблица `logs`
- `id` - Уникальный ID
- `telegram_id` - ID пользователя в Telegram
- `action` - Действие
- `details` - Детали действия
- `created_at` - Дата создания

## Безопасность

- ✅ Проверка подписи webhook от Prodamus
- ✅ Валидация данных платежа
- ✅ Ограничение времени действия платежных ссылок (24 часа)
- ✅ Ограничение времени действия приглашений в канал (7 дней)

## Логирование

Бот ведет подробные логи всех действий:
- Создание платежных ссылок
- Обработка webhook
- Предоставление доступа к каналу
- Ошибки и исключения

## Развертывание

### Локальный сервер
1. Установите зависимости
2. Настройте переменные окружения
3. Запустите бота: `npm start`

### VPS/Cloud сервер
1. Загрузите код на сервер
2. Установите Node.js и npm
3. Настройте переменные окружения
4. Настройте reverse proxy (nginx) для HTTPS
5. Запустите бота как сервис

### Docker (опционально)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Мониторинг

Рекомендуется настроить мониторинг:
- Логи приложения
- Статус базы данных
- Доступность webhook
- Статистика платежей

## Поддержка

При возникновении проблем:
1. Проверьте логи приложения
2. Убедитесь в правильности настроек
3. Проверьте доступность webhook URL
4. Обратитесь к документации Prodamus

## Лицензия

MIT License
