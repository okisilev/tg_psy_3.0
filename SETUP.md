# Настройка Telegram бота

## ❌ Ошибка: 401 Unauthorized

Эта ошибка означает, что токен Telegram бота неверный или не настроен.

## 🔧 Решение:

### 1. Создайте Telegram бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Введите название бота (например: "My Payment Bot")
4. Введите username бота (например: "my_payment_bot")
5. Скопируйте полученный токен (формат: `1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ`)

### 2. Создайте файл .env

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=ВАШ_ТОКЕН_БОТА_ЗДЕСЬ
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

### 3. Настройте канал

1. Создайте канал в Telegram
2. Добавьте бота в канал как администратора
3. Укажите ID канала в `TELEGRAM_CHANNEL_ID` (например: `@your_channel` или `-1001234567890`)

### 4. Настройте Prodamus

1. Зарегистрируйтесь на [Prodamus](https://prodamus.ru)
2. Создайте платежную форму
3. Получите секретный ключ и ссылку на форму
4. Укажите webhook URL в настройках Prodamus: `https://your-domain.com/webhook/prodamus`

### 5. Запустите бота

```bash
npm start
```

## 📋 Пример правильного .env файла:

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
TELEGRAM_CHANNEL_ID=@my_private_channel
PRODAMUS_SECRET_KEY=sk_test_1234567890abcdef
PRODAMUS_LINK_TO_FORM=https://mycompany.payform.ru/pay
PRODAMUS_WEBHOOK_URL=https://mybot.com/webhook/prodamus
PORT=3000
NODE_ENV=development
DATABASE_PATH=./bot.db
```

## ⚠️ Важно:

- НЕ используйте тестовые токены в продакшне
- НЕ публикуйте файл .env в репозиторий
- Убедитесь, что все токены действительны
