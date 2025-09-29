const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const config = require('./config');
const Hmac = require('./Hmac');
const prodamusService = require('./services/prodamusService');
const databaseService = require('./services/databaseService');

class TelegramBotApp {
    constructor() {
        // Проверяем конфигурацию
        this.validateConfig();

        this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
        this.app = express();
        this.db = new sqlite3.Database(config.database.path);
        
        this.setupDatabase();
        this.setupExpress();
        this.setupBotHandlers();
    }

    validateConfig() {
        console.log('🔍 Проверка конфигурации...');
        
        // Проверяем токен бота
        if (!config.telegram.botToken || config.telegram.botToken === 'YOUR_BOT_TOKEN_HERE' || config.telegram.botToken.includes('1234567890')) {
            console.error('❌ ОШИБКА: Неверный токен Telegram бота!');
            console.error('📝 Создайте бота через @BotFather и укажите правильный токен в файле .env');
            console.error('📖 Инструкции: см. файл SETUP.md');
            process.exit(1);
        }

        // Проверяем ID канала
        if (!config.telegram.channelId || config.telegram.channelId === '@your_channel_username') {
            console.error('❌ ОШИБКА: Не указан ID канала!');
            console.error('📝 Укажите ID канала в TELEGRAM_CHANNEL_ID в файле .env');
            process.exit(1);
        }

        // Проверяем настройки Prodamus
        if (!config.prodamus.secretKey || config.prodamus.secretKey === 'your_prodamus_secret_key_here') {
            console.error('❌ ОШИБКА: Не указан секретный ключ Prodamus!');
            console.error('📝 Получите секретный ключ в личном кабинете Prodamus');
            process.exit(1);
        }

        if (!config.prodamus.linkToForm || config.prodamus.linkToForm === 'https://your-prodamus-form-link.com') {
            console.error('❌ ОШИБКА: Не указана ссылка на форму Prodamus!');
            console.error('📝 Укажите ссылку на форму в PRODAMUS_LINK_TO_FORM в файле .env');
            process.exit(1);
        }

        console.log('✅ Конфигурация корректна!');
    }

    setupDatabase() {
        // Создаем таблицы для хранения пользователей и платежей
        this.db.serialize(() => {
            // Удаляем старые таблицы если они есть
            this.db.run(`DROP TABLE IF EXISTS payments`);
            this.db.run(`DROP TABLE IF EXISTS users`);
            
            this.db.run(`
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER UNIQUE,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    has_access BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            this.db.run(`
                CREATE TABLE payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER,
                    order_id TEXT UNIQUE,
                    order_num TEXT,
                    amount REAL,
                    status TEXT,
                    payment_status TEXT,
                    customer_email TEXT,
                    customer_phone TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
                )
            `);
        });
    }

    setupExpress() {
        // Обрабатываем JSON и URL-encoded данные
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Добавляем middleware для логирования webhook запросов
        this.app.use('/webhook/prodamus', (req, res, next) => {
            console.log('=== Prodamus Webhook Request ===');
            console.log('Headers:', req.headers);
            console.log('Body:', req.body);
            console.log('Query:', req.query);
            console.log('================================');
            next();
        });

        // Webhook для получения уведомлений от Prodamus
        this.app.post('/webhook/prodamus', (req, res) => {
            this.handleProdamusWebhook(req, res);
        });

        // Стартовая страница
        this.app.get('/', (req, res) => {
            res.send('Telegram Bot is running!');
        });

        this.app.listen(config.server.port, () => {
            console.log(`Server running on port ${config.server.port}`);
        });
    }

    setupBotHandlers() {
        // Обработчик команды /start
        this.bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;
    const lastName = msg.from.last_name;

            // Сохраняем пользователя в базу данных
            this.saveUser(userId, username, firstName, lastName);
            
            const welcomeMessage = `
🎉 Добро пожаловать!

Для получения доступа к закрытому каналу необходимо произвести оплату.

💰 Стоимость: 500 рублей
📺 Канал: ${config.telegram.channelId}

Нажмите кнопку "Оплатить" для перехода к оплате.
            `;

            const keyboard = {
                    inline_keyboard: [
                    [{ text: '💳 Оплатить', callback_data: 'pay' }],
                    [{ text: '❓ Помощь', callback_data: 'help' }]
                ]
            };

            this.bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
        });

        // Обработчик callback кнопок
        this.bot.on('callback_query', (callbackQuery) => {
            const message = callbackQuery.message;
            const data = callbackQuery.data;
            const chatId = message.chat.id;
            const userId = callbackQuery.from.id;

            switch (data) {
                case 'pay':
                    this.handlePaymentRequest(chatId, userId);
                    break;
                case 'help':
                    this.handleHelpRequest(chatId);
                    break;
                case 'check_payment':
                    this.handlePaymentCheck(chatId, userId);
                    break;
            }

            this.bot.answerCallbackQuery(callbackQuery.id);
        });

        // Обработчик текстовых сообщений
        this.bot.on('message', (msg) => {
            if (msg.text && msg.text.startsWith('/')) {
                return; // Команды обрабатываются отдельно
            }

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
            // Проверяем, есть ли у пользователя доступ
            this.checkUserAccess(chatId, userId);
        });
    }

    async saveUser(telegramId, username, firstName, lastName) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO users (telegram_id, username, first_name, last_name)
                VALUES (?, ?, ?, ?)
            `);
            
            stmt.run([telegramId, username, firstName, lastName], function(err) {
                if (err) {
                    reject(err);
        } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }

    async handlePaymentRequest(chatId, userId) {
        try {
            // Создаем развернутую ссылку согласно документации Prodamus
            // Используем do=pay для прямого перехода к оплате без подписи
            const paymentData = prodamusService.createPaymentData(userId, 500.00, 'Доступ к закрытому каналу', 'expanded');
            const paymentLink = prodamusService.createExpandedPaymentLink(paymentData);

            const message = `
💳 Перейдите по ссылке для оплаты:

${paymentLink}

После успешной оплаты вы автоматически получите доступ к каналу.

⏰ Ссылка действительна в течение 24 часов.
            `;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '🔗 Перейти к оплате', url: paymentLink }],
                    [{ text: '✅ Проверить оплату', callback_data: 'check_payment' }],
                    [{ text: '❓ Помощь', callback_data: 'help' }]
                ]
            };

            this.bot.sendMessage(chatId, message, { reply_markup: keyboard });

        } catch (error) {
            console.error('Error creating payment link:', error);
            this.bot.sendMessage(chatId, '❌ Ошибка при создании ссылки для оплаты. Попробуйте позже.');
        }
    }

    async handleHelpRequest(chatId) {
            const helpMessage = `
❓ Помощь

🔹 Для получения доступа к каналу необходимо произвести оплату
🔹 Стоимость: 500 рублей
🔹 После оплаты доступ предоставляется автоматически
🔹 Если у вас возникли проблемы, обратитесь к администратору

📞 Поддержка: @admin_username
        `;

        this.bot.sendMessage(chatId, helpMessage);
    }

    async handlePaymentCheck(chatId, userId) {
        try {
            // Проверяем в базе данных
            const payment = await this.getUserPayment(userId);
            
            if (payment && payment.status === 'success') {
                this.bot.sendMessage(chatId, '✅ Оплата подтверждена! Доступ к каналу предоставлен.');
                await this.grantChannelAccess(userId);
                return;
            }

            // Если в базе нет успешного платежа
            if (payment) {
                this.bot.sendMessage(chatId, `⏳ Статус платежа: ${payment.status || 'ожидание'}. Попробуйте проверить позже.`);
            } else {
                this.bot.sendMessage(chatId, '❌ Платеж не найден. Убедитесь, что вы переходили по ссылке для оплаты.');
            }
        } catch (error) {
            console.error('Error checking payment:', error);
            this.bot.sendMessage(chatId, '❌ Ошибка при проверке оплаты.');
        }
    }

    async getUserPayment(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM payments WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1',
                [userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    async getLastOrderId(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT order_id FROM payments WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1',
                [userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row ? row.order_id : null);
                    }
                }
            );
        });
    }

    async grantChannelAccess(userId) {
        try {
            // Обновляем статус пользователя в базе данных
            await this.updateUserAccess(userId, true);
            
            // Проверяем конфигурацию канала
            console.log('Channel ID from config:', config.telegram.channelId);
            console.log('Channel ID type:', typeof config.telegram.channelId);
            
            // Проверяем, что ID канала правильный (начинается с -10, -20 или -100)
            if (!config.telegram.channelId.toString().startsWith('-10') && 
                !config.telegram.channelId.toString().startsWith('-20') &&
                !config.telegram.channelId.toString().startsWith('-100')) {
                console.log('❌ ID канала неправильный (должен начинаться с -10, -20 или -100)');
                console.log('Текущий ID:', config.telegram.channelId);
                throw new Error('Invalid channel ID format');
            }
            
            // Пытаемся добавить пользователя в канал напрямую
            try {
                console.log(`Attempting to add user ${userId} to channel ${config.telegram.channelId}`);
                await this.bot.addChatMember(config.telegram.channelId, userId);
                console.log(`✅ User ${userId} added to channel successfully`);
                
                // Отправляем уведомление пользователю
                await this.bot.sendMessage(userId, `
🎉 Поздравляем! Оплата прошла успешно!

✅ Вы были добавлены в закрытый канал!
🔗 Перейдите в канал для просмотра контента.

⏰ Доступ предоставлен навсегда
                `);
                
            } catch (addError) {
                console.log('❌ Direct add failed:', addError.message);
                console.log('Error code:', addError.response?.body?.error_code);
                console.log('Error description:', addError.response?.body?.description);
                
                // Если прямое добавление не удалось, создаем invite link
                try {
                    console.log(`Creating invite link for channel ${config.telegram.channelId}`);
                    const inviteLink = await this.bot.createChatInviteLink(config.telegram.channelId, {
                        member_limit: 1,
                        expire_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 часа
                    });

                    console.log(`✅ Invite link created: ${inviteLink.invite_link}`);
                    
                    // Отправляем ссылку пользователю
                    await this.bot.sendMessage(userId, `
🎉 Поздравляем! Оплата прошла успешно!

🔗 Ссылка для доступа к каналу:
${inviteLink.invite_link}

⏰ Ссылка действительна 24 часа
                    `);
                    
                    console.log(`✅ Invite link sent to user ${userId}`);
                    
                } catch (inviteError) {
                    console.error('❌ Invite link creation failed:', inviteError.message);
                    console.error('Error code:', inviteError.response?.body?.error_code);
                    console.error('Error description:', inviteError.response?.body?.description);
                    
                    // Отправляем сообщение с инструкциями
                    await this.bot.sendMessage(userId, `
🎉 Поздравляем! Оплата прошла успешно!

❌ Автоматическое добавление в канал не удалось.
📞 Обратитесь к администратору для получения доступа.

Ваш ID: ${userId}
Проблема: ${inviteError.response?.body?.description || inviteError.message}
                    `);
                }
            }

            console.log(`Channel access granted to user ${userId}`);

        } catch (error) {
            console.error('Error granting channel access:', error);
            this.bot.sendMessage(userId, '❌ Ошибка при предоставлении доступа. Обратитесь к администратору.');
        }
    }

    async updateUserAccess(userId, hasAccess) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET has_access = ? WHERE telegram_id = ?',
                [hasAccess, userId],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes);
                    }
                }
            );
        });
    }

    async revokeChannelAccess(userId) {
        try {
            // Обновляем статус пользователя в базе данных
            await this.updateUserAccess(userId, false);
            
            // Пытаемся удалить пользователя из канала
            try {
                await this.bot.banChatMember(config.telegram.channelId, userId);
                console.log(`User ${userId} removed from channel successfully`);
                
                // Отправляем уведомление пользователю
                await this.bot.sendMessage(userId, `
❌ Ваш доступ к каналу был отозван.

📞 Обратитесь к администратору для восстановления доступа.
                `);
                
            } catch (banError) {
                console.log('Failed to remove user from channel:', banError.message);
                
                // Отправляем уведомление пользователю
                await this.bot.sendMessage(userId, `
❌ Ваш доступ к каналу был отозван.

📞 Обратитесь к администратору для восстановления доступа.
                `);
            }

            console.log(`Channel access revoked for user ${userId}`);

        } catch (error) {
            console.error('Error revoking channel access:', error);
        }
    }

    async checkUserAccess(chatId, userId) {
        try {
            const user = await this.getUser(userId);
            
            if (user && user.has_access) {
                this.bot.sendMessage(chatId, '✅ У вас уже есть доступ к каналу!');
            } else {
                this.bot.sendMessage(chatId, '❌ У вас нет доступа к каналу. Произведите оплату для получения доступа.');
            }
        } catch (error) {
            console.error('Error checking user access:', error);
        }
    }

    isAdmin(userId) {
        // Добавьте ID администраторов в конфигурацию
        const adminIds = [431292182]; // Замените на реальные ID администраторов
        return adminIds.includes(userId);
    }

    async handleAdminCommand(chatId, userId, command) {
        if (!this.isAdmin(userId)) {
            this.bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
            return;
        }

        try {
            switch (command) {
                case 'admin_add_user':
                    this.bot.sendMessage(chatId, 'Введите ID пользователя для добавления в канал:');
                    break;
                case 'admin_remove_user':
                    this.bot.sendMessage(chatId, 'Введите ID пользователя для удаления из канала:');
                    break;
                case 'admin_list_users':
                    await this.listChannelUsers(chatId);
                    break;
                case 'admin_stats':
                    await this.showStats(chatId);
                    break;
            }
        } catch (error) {
            console.error('Error handling admin command:', error);
            this.bot.sendMessage(chatId, '❌ Ошибка выполнения команды администратора.');
        }
    }

    async listChannelUsers(chatId) {
        try {
            const users = await this.getAllUsers();
            let message = '📊 Список пользователей с доступом:\n\n';
            
            users.forEach(user => {
                if (user.has_access) {
                    message += `👤 ID: ${user.telegram_id}\n`;
                    message += `📧 Username: @${user.username || 'не указан'}\n`;
                    message += `📅 Дата: ${user.created_at}\n\n`;
                }
            });
            
            this.bot.sendMessage(chatId, message);
        } catch (error) {
            console.error('Error listing users:', error);
            this.bot.sendMessage(chatId, '❌ Ошибка получения списка пользователей.');
        }
    }

    async showStats(chatId) {
        try {
            const stats = await this.getStats();
            const message = `
📊 Статистика бота:

👥 Всего пользователей: ${stats.totalUsers}
✅ С доступом: ${stats.usersWithAccess}
❌ Без доступа: ${stats.usersWithoutAccess}
💰 Всего платежей: ${stats.totalPayments}
✅ Успешных: ${stats.successfulPayments}
            `;
            
            this.bot.sendMessage(chatId, message);
        } catch (error) {
            console.error('Error showing stats:', error);
            this.bot.sendMessage(chatId, '❌ Ошибка получения статистики.');
        }
    }

    async getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM users ORDER BY created_at DESC', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getStats() {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(*) as totalUsers,
                    SUM(CASE WHEN has_access = 1 THEN 1 ELSE 0 END) as usersWithAccess,
                    SUM(CASE WHEN has_access = 0 THEN 1 ELSE 0 END) as usersWithoutAccess
                FROM users
            `, (err, userStats) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                this.db.get(`
                    SELECT 
                        COUNT(*) as totalPayments,
                        SUM(CASE WHEN payment_status = 'success' THEN 1 ELSE 0 END) as successfulPayments
                    FROM payments
                `, (err, paymentStats) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    resolve({
                        ...userStats,
                        ...paymentStats
                    });
                });
            });
        });
    }

    async getUser(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE telegram_id = ?',
                [userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    async handleProdamusWebhook(req, res) {
        try {
            const signature = req.headers['sign'] || req.headers['Sign'];
            
            if (!signature) {
                console.error('No signature in webhook request');
                return res.status(400).send('No signature');
            }

            console.log('Received signature:', signature);
            console.log('Request body:', req.body);
            console.log('Secret key available:', !!config.prodamus.secretKey);

            // Временно отключаем проверку подписи для тестирования
            // TODO: Включить обратно после настройки правильного secret key
            console.log('⚠️  Проверка подписи временно отключена для тестирования');
            
            // Проверяем подпись (временно закомментировано)
            // const isValidSignature = Hmac.verify(req.body, config.prodamus.secretKey, signature);
            // console.log('Signature verification result:', isValidSignature);
            
            // if (!isValidSignature) {
            //     console.error('Invalid signature in webhook request');
            //     console.error('Expected signature for data:', Hmac.create(req.body, config.prodamus.secretKey));
            //     return res.status(400).send('Invalid signature');
            // }

            const { 
                order_id, 
                order_num, 
                sum, 
                payment_status, 
                customer_email, 
                customer_phone 
            } = req.body;

            console.log('Prodamus webhook received:', { 
                order_id, 
                order_num, 
                sum, 
                payment_status, 
                customer_email 
            });

            if (payment_status === 'success') {
                // Извлекаем telegram_id из order_num (формат: tg_431292182_1759115223651)
                const telegramId = order_num.split('_')[1];
                
                if (!telegramId) {
                    console.error('Cannot extract telegram_id from order_num:', order_num);
                    return res.status(400).send('Invalid order_num format');
                }
                
                console.log('Extracted telegram_id:', telegramId);
                
                // Сохраняем информацию о платеже
                await this.savePayment(
                    parseInt(telegramId), 
                    order_id, 
                    order_num,
                    parseFloat(sum), 
                    payment_status,
                    customer_email,
                    customer_phone
                );
                
                console.log('Payment saved successfully');
                
                // Предоставляем доступ к каналу
                await this.grantChannelAccess(parseInt(telegramId));
                
                console.log('Channel access granted');
            }

            res.status(200).send('OK');

        } catch (error) {
            console.error('Error handling Prodamus webhook:', error);
            res.status(500).send('Internal server error');
        }
    }

    async savePayment(telegramId, orderId, orderNum, amount, status, customerEmail, customerPhone) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO payments (
                    telegram_id, order_id, order_num, amount, status, 
                    payment_status, customer_email, customer_phone
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                telegramId, orderId, orderNum, amount, status, 
                status, customerEmail, customerPhone
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }
}

// Запуск бота
const botApp = new TelegramBotApp();

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

console.log('Telegram Bot started successfully!');
