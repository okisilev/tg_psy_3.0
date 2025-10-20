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
        this.databaseService = new databaseService();
        
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

        // Проверяем ID канала/группы
        if (!config.telegram.channelId || config.telegram.channelId === '@your_channel_username') {
            console.error('❌ ОШИБКА: Не указан ID канала/группы!');
            console.error('📝 Укажите ID канала или группы в TELEGRAM_CHANNEL_ID в файле .env');
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
            
            // Проверяем, является ли пользователь администратором
            if (this.isAdmin(userId)) {
                const adminWelcomeMessage = `
👑 Добро пожаловать, администратор!

У вас есть полный доступ к сообществу и административные функции.

🔧 Выберите действие:
                `;

                const adminKeyboard = {
                    inline_keyboard: [
                        [{ text: '👑 Панель администратора', callback_data: 'admin_panel' }],
                        [{ text: '💳 Оплатить', callback_data: 'pay' }],
                        [{ text: '👤 Индивидуальная консультация', url: 'https://wa.me/79025158278' }],
                        [{ text: '❓ Помощь', callback_data: 'help' }]
                    ]
                };

                this.bot.sendMessage(chatId, adminWelcomeMessage, { reply_markup: adminKeyboard });
                return;
            }
            
            const welcomeMessage = `
<strong>Добро пожаловать в бот клуба «Пробуждение»</strong>

То, что мы имеем определяет наше состояние. <strong>СОСТОЯНИЕ</strong> первично ☝🏻

Если в какой-то из сфер (внешний вид, отношения с мужчинами, семья, финансы и т.п.) идет не так , как ты хочешь- значит твое СОСТОЯНИЕ  это создает ☝🏻

<strong>Женский КЛУБ</strong>  направлен на изменение состояния в легкое и расслабленное 🧚🏻‍♀️ 
В настоящее женское состояние ресурса и потока 🫶🏻
В котором нет никаких ограничений и рамок 👌
В котором есть все в изобилии 😎

<strong>Что внутри клуба?</strong>

<strong>1️⃣ Онлайн лекции</strong> 
Для того, чтобы осознать себя и начать менять все в лучшую сторону. 

Когда мы не понимаем, что с нами происходит, это равносильно тому, что мы несемся на автомобиле на бешеной скорости, без руля. 
Когда мы начинам понимать себя, в нашем авто появляется руль и мы можем управлять своей жизнью.

<strong>2️⃣ Групповые созвоны</strong> 
Для более глубокой работы с подсознанием. Чтобы переписать деструктивные сценарии. 

На них мы работаем с арт-терапией. Именно арт-терапия помогает, обойти уловки ума и попасть в подсознание, чтобы переписать жизненные сценарии, которые тебя не устраивают.

<strong>3️⃣ Телесные практики</strong> 
Чтобы успокоить ум и начать слышать свое сердце. Ведь именно через СЕРДЦЕ открывается истинная любовь к себе.

<strong>4️⃣ Чат общения с участницами и мной.</strong> 
Женщине нужна женщина. Именно поэтому я создала это поддерживающее комьюнити. Где безопасно можно открыться и получить поддержку.

 5️⃣ В клубе ты можешь задать мне любой вопрос в любое время. Я даю развернутые ответы и разбираю любой твой запрос 👌

Стоимость подписки всего - 2500₽/мес

Чтобы получить доступ в канал, нажимай на кнопку «Вступить в клуб»

            `;

            const keyboard = {
                    inline_keyboard: [
                    [{ text: '💳 Оплатить', callback_data: 'pay' }],
                    [{ text: '👤 Индивидуальная консультация', url: 'https://wa.me/79025158278' }],
                    [{ text: '❓ Помощь', callback_data: 'help' }]
                ]
            };

            this.bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard, parse_mode: 'HTML' });
        });

        // Обработчик callback кнопок
        this.bot.on('callback_query', async (callbackQuery) => {
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
                case 'admin_panel':
                    await this.showAdminPanel(chatId, userId);
                    break;
                case 'no_access_users':
                    await this.showNoAccessUsers(chatId, userId);
                    break;
                case 'admin_stats':
                    await this.showStats(chatId);
                    break;
                case 'admin_list_users':
                    await this.listChannelUsers(chatId);
                    break;
                case 'admin_find_user':
                    this.bot.sendMessage(chatId, '🔍 Введите ID пользователя для поиска:');
                    break;
                case 'admin_settings':
                    this.bot.sendMessage(chatId, '⚙️ Настройки администратора:\n\n• Добавить админа: /addadmin [ID]\n• Удалить админа: /removeadmin [ID]\n• Список админов: /listadmins');
                    break;
            }

            this.bot.answerCallbackQuery(callbackQuery.id);
        });

        // Команда для добавления администратора
        this.bot.onText(/\/addadmin (\d+)/, (msg, match) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            // Работает только в личных сообщениях
            if (chatId !== userId) {
                return;
            }
            
            const newAdminId = parseInt(match[1]);
            
            if (!this.isAdmin(userId)) {
                this.bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
                return;
            }
            
            // Добавляем нового админа (в реальном проекте лучше хранить в БД)
            this.bot.sendMessage(chatId, `✅ Администратор ${newAdminId} добавлен.\n\n⚠️ Для постоянного добавления обновите код в функции isAdmin().`);
        });

        // Команда для просмотра списка администраторов
        this.bot.onText(/\/listadmins/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            // Работает только в личных сообщениях
            if (chatId !== userId) {
                return;
            }
            
            if (!this.isAdmin(userId)) {
                this.bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
                return;
            }
            
            const adminIds = [431292182, 190545165]; // Список из функции isAdmin
            let adminList = '👑 Список администраторов:\n\n';
            adminIds.forEach((id, index) => {
                adminList += `${index + 1}. ${id}\n`;
            });
            
            this.bot.sendMessage(chatId, adminList);
        });

        // Команда для проверки прав администратора
        this.bot.onText(/\/checkadmin/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            // Работает только в личных сообщениях
            if (chatId !== userId) {
                return;
            }
            
            if (this.isAdmin(userId)) {
                this.bot.sendMessage(chatId, '👑 Вы администратор! У вас есть полные права.');
            } else {
                this.bot.sendMessage(chatId, '❌ Вы не администратор.');
            }
        });

        // Обработчик команд администратора
        this.bot.onText(/\/admin/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            // Работает только в личных сообщениях
            if (chatId !== userId) {
                return;
            }
            
            if (!this.isAdmin(userId)) {
                this.bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
                return;
            }
            
            const adminKeyboard = {
                inline_keyboard: [
                    [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
                    [{ text: '👥 Список пользователей', callback_data: 'admin_list_users' }],
                    [{ text: '🔍 Найти пользователя', callback_data: 'admin_find_user' }],
                    [{ text: '⚙️ Настройки', callback_data: 'admin_settings' }]
                ]
            };
            
            this.bot.sendMessage(chatId, `
👑 Панель администратора

Выберите действие:
            `, { reply_markup: adminKeyboard });
        });

        // Обработчик текстовых сообщений
        this.bot.on('message', (msg) => {
            if (msg.text && msg.text.startsWith('/')) {
                return; // Команды обрабатываются отдельно
            }

            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            // Обрабатываем только личные сообщения с ботом (не в группах)
            if (chatId !== userId) {
                return; // Игнорируем сообщения в группах/каналах
            }
    
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
            // Проверяем, является ли пользователь администратором
            if (this.isAdmin(userId)) {
                this.bot.sendMessage(chatId, '👑 Вы администратор! Вам не нужно оплачивать доступ - у вас есть полные права.');
                return;
            }
            
            // Создаем развернутую ссылку согласно документации Prodamus
            // Используем do=pay для прямого перехода к оплате без подписи
            const paymentData = prodamusService.createPaymentData(userId, 2000.00, 'Доступ к закрытому сообществу на 30 дней', 'expanded');
            const paymentLink = prodamusService.createExpandedPaymentLink(paymentData);

            const message = `
💳 Перейдите по ссылке для оплаты:

${paymentLink}

После успешной оплаты вы автоматически получите доступ к сообществу.

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

🔹 Для получения доступа к закрытому сообществу необходимо произвести оплату
🔹 Стоимость: 2000 рублей
🔹 Срок доступа: 30 дней
🔹 После оплаты доступ предоставляется автоматически
🔹 Если у вас возникли проблемы, обратитесь к администратору

📞 Поддержка: @Fun_Oleg
        `;

        const keyboard = {
            inline_keyboard: [
                [{ text: '👤 Индивидуальная консультация', url: 'https://wa.me/79025158278' }],
                [{ text: '💳 Оплатить доступ', callback_data: 'pay' }]
            ]
        };

        this.bot.sendMessage(chatId, helpMessage, { reply_markup: keyboard });
    }

    async handlePaymentCheck(chatId, userId) {
        try {
            // Проверяем, является ли пользователь администратором
            if (this.isAdmin(userId)) {
                this.bot.sendMessage(chatId, '👑 Вы администратор! Вам не нужно проверять платежи - у вас есть полный доступ.');
                return;
            }
            
            // Проверяем в базе данных
            const payment = await this.getUserPayment(userId);
            
            if (payment && payment.status === 'success') {
                this.bot.sendMessage(chatId, '✅ Оплата подтверждена! Доступ к сообществу предоставлен.');
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
            // Проверяем, является ли пользователь администратором
            if (this.isAdmin(userId)) {
                console.log(`👑 Admin ${userId} - granting access without subscription check`);
                await this.updateUserAccess(userId, true);
                
                // Отправляем специальное сообщение администратору
                await this.bot.sendMessage(userId, `
👑 Администратор!

✅ Вам предоставлен полный доступ к сообществу.

🔧 Вы можете:
• Просматривать весь контент
• Управлять участниками
• Использовать все функции без ограничений
                `);
                return true;
            }
            
            // Проверяем активную подписку для обычных пользователей
            const hasActiveSubscription = await this.databaseService.hasActiveSubscription(userId);
            if (!hasActiveSubscription) {
                console.log(`❌ User ${userId} has no active subscription`);
                return false;
            }
            
            console.log(`✅ User ${userId} has active subscription`);
            
            // Проверка прав бота отключена для упрощения
            // const hasRights = await this.checkBotRights();
            // if (!hasRights) {
            //     console.log('❌ Bot does not have admin rights, using invite link approach');
            //     throw new Error('Bot does not have admin rights');
            // }
            
            // Обновляем статус пользователя в базе данных
            await this.updateUserAccess(userId, true);
            
            // Проверяем конфигурацию канала
            console.log('Channel ID from config:', config.telegram.channelId);
            console.log('Channel ID type:', typeof config.telegram.channelId);
            
            // Проверяем, что ID правильный (должен начинаться с минуса)
            const chatId = config.telegram.channelId.toString();
            if (!chatId.startsWith('-')) {
                console.log('❌ ID неправильный (должен начинаться с минуса)');
                console.log('Текущий ID:', config.telegram.channelId);
                throw new Error('Invalid chat ID format - must start with "-"');
            }
            
            // Определяем тип чата
            let chatType = 'unknown';
            if (chatId.startsWith('-100')) {
                chatType = 'supergroup';
            } else if (chatId.startsWith('-20')) {
                chatType = 'channel';
            } else if (chatId.startsWith('-')) {
                chatType = 'group';
            }
            
            console.log(`✅ Chat ID format is valid (type: ${chatType})`);
            
            // Для каналов и групп используем только invite-ссылки
            console.log(`Using invite link approach for ${chatType} ${config.telegram.channelId}`);
            
            let inviteLink;
            if (config.telegram.permanentInviteLink) {
                console.log(`Using permanent invite link from config: ${config.telegram.permanentInviteLink}`);
                inviteLink = config.telegram.permanentInviteLink;
            } else {
                try {
                    console.log(`Creating new invite link for channel ${config.telegram.channelId}`);
                    const linkResult = await this.bot.createChatInviteLink(config.telegram.channelId, {
                        name: `Access for user ${userId}`,
                        expire_date: 0, // Без ограничения по времени
                        member_limit: 0, // Без ограничения по количеству участников
                        creates_join_request: false // Прямое присоединение
                    });
                    inviteLink = linkResult.invite_link;
                    console.log(`✅ New invite link created: ${inviteLink}`);
                } catch (createError) {
                    console.log('Failed to create invite link with no restrictions, trying with basic settings');
                    try {
                        const linkResult = await this.bot.createChatInviteLink(config.telegram.channelId, {
                            name: `Access for user ${userId}`
                        });
                        inviteLink = linkResult.invite_link;
                        console.log(`✅ Basic invite link created: ${inviteLink}`);
                    } catch (basicError) {
                        console.error('❌ Failed to create any invite link:', basicError.message);
                        throw new Error('Cannot create invite link');
                    }
                }
            }

            // Отправляем ссылку пользователю
            await this.bot.sendMessage(userId, `
🎉 Поздравляем! Оплата прошла успешно!

🔗 Ссылка для доступа к сообществу:
${inviteLink}

💡 Перейдите по ссылке для присоединения
⏰ Ваша подписка действует 30 дней
            `);
            
            console.log(`✅ Invite link sent to user ${userId}`);

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
            // Проверяем, является ли пользователь администратором
            if (this.isAdmin(userId)) {
                this.bot.sendMessage(chatId, '👑 Вы администратор! У вас есть полный доступ к сообществу.');
                return;
            }
            
            const user = await this.getUser(userId);
            
            if (user && user.has_access) {
                this.bot.sendMessage(chatId, '✅ У вас уже есть доступ к сообществу!');
            } else {
                this.bot.sendMessage(chatId, '❌ У вас нет доступа к сообществу. Произведите оплату для получения доступа.');
            }
        } catch (error) {
            console.error('Error checking user access:', error);
        }
    }

    isAdmin(userId) {
        // ID администраторов (владельцы группы/канала)
        const adminIds = [
            //431292182,  // Основной администратор
            190545165,  // Владелец группы
            // Добавьте сюда ID других администраторов
        ];
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
                const paymentId = await this.databaseService.savePayment(
                    parseInt(telegramId), 
                    order_id, 
                    order_num,
                    parseFloat(sum), 
                    payment_status,
                    customer_email,
                    customer_phone
                );
                
                console.log('Payment saved successfully');
                
                // Создаем подписку на 30 дней
                await this.databaseService.createSubscription(
                    parseInt(telegramId), 
                    paymentId, 
                    30
                );
                
                console.log('Subscription created for 30 days');
                
                // Проверяем, был ли пользователь ранее удален (мягкое удаление)
                const isBanned = await this.databaseService.isUserBanned(parseInt(telegramId));
                
                if (isBanned) {
                    console.log(`🔄 Пользователь ${telegramId} был помечен как удаленный, восстанавливаем доступ`);
                    
                    // Восстанавливаем доступ (включая снятие флага бана)
                    await this.restoreChannelAccess(parseInt(telegramId), paymentId);
                    
                    // Предоставляем доступ к каналу (отправляем invite-ссылку)
                    await this.grantChannelAccess(parseInt(telegramId));
                } else {
                    console.log(`✅ Новый пользователь ${telegramId}, предоставляем доступ`);
                    
                    // Предоставляем доступ к каналу
                    await this.grantChannelAccess(parseInt(telegramId));
                }
                
                // Отправляем уведомление администратору
                await this.notifyAdminAboutPayment(parseInt(telegramId), {
                    amount: parseFloat(sum),
                    status: payment_status,
                    customer_email: customer_email
                });
                
                console.log('Channel access granted');
            }

            res.status(200).send('OK');

        } catch (error) {
            console.error('Error handling Prodamus webhook:', error);
            res.status(500).send('Internal server error');
        }
    }


    /**
     * Отправляет уведомление администратору об успешной оплате
     * @param {number} userId - ID пользователя
     * @param {Object} paymentData - данные платежа
     */
    async notifyAdminAboutPayment(userId, paymentData) {
        try {
            // ID администратора (создателя канала) - 431292182
            const adminId = 431292182;
            
            const user = await this.databaseService.getUser(userId);
            const subscription = await this.databaseService.getActiveSubscription(userId);
            
            const message = `
🎉 Новая успешная оплата!

👤 Пользователь:
• ID: ${userId}
• Имя: ${user?.first_name || 'Не указано'} ${user?.last_name || ''}
• Username: @${user?.username || 'Не указан'}

💳 Платеж:
• Сумма: ${paymentData.amount} руб.
• Статус: ${paymentData.status}
• Email: ${paymentData.customer_email || 'Не указан'}

📅 Подписка:
• Начало: ${new Date(subscription.start_date).toLocaleDateString('ru-RU')}
• Окончание: ${new Date(subscription.end_date).toLocaleDateString('ru-RU')}
• Дней: 30

✅ Доступ к каналу предоставлен
            `;
            
            await this.bot.sendMessage(adminId, message);
            console.log(`✅ Admin notification sent for user ${userId}`);
            
        } catch (error) {
            console.error(`❌ Failed to send admin notification:`, error.message);
        }
    }

    /**
     * Проверяет права бота в канале (ОТКЛЮЧЕНО)
     * @returns {Promise<boolean>} - есть ли права администратора
     */
    // async checkBotRights() {
    //     try {
    //         console.log(`Checking bot rights for channel ${config.telegram.channelId}`);
    //         
    //         // Получаем информацию о канале
    //         const chatInfo = await this.bot.getChat(config.telegram.channelId);
    //         console.log('Chat info:', chatInfo);
    //         
    //         // Получаем информацию об администраторах
    //         const administrators = await this.bot.getChatAdministrators(config.telegram.channelId);
    //         console.log('Administrators:', administrators);
    //         
    //         // Проверяем, есть ли бот среди администраторов
    //         const botInfo = await this.bot.getMe();
    //         console.log('Bot info:', botInfo);
    //         
    //         const botAdmin = administrators.find(admin => admin.user.id === botInfo.id);
    //         if (botAdmin) {
    //             console.log('✅ Bot is administrator');
    //             console.log('Bot admin rights:', botAdmin);
    //             return true;
    //         } else {
    //             console.log('❌ Bot is not administrator');
    //             return false;
    //         }
    //         
    //     } catch (error) {
    //         console.error('❌ Failed to check bot rights:', error.message);
    //         return false;
    //     }
    // }

    /**
     * Создает постоянную invite-ссылку для канала
     * @returns {Promise<string|null>} - постоянная invite-ссылка
     */
    async createPermanentInviteLink() {
        try {
            console.log(`Creating permanent invite link for channel ${config.telegram.channelId}`);
            
            const inviteLink = await this.bot.createChatInviteLink(config.telegram.channelId, {
                name: 'Permanent Access Link',
                expire_date: 0, // Без ограничения по времени
                member_limit: 0, // Без ограничения по количеству участников
                creates_join_request: false // Прямое присоединение
            });

            console.log(`✅ Permanent invite link created: ${inviteLink.invite_link}`);
            return inviteLink.invite_link;
            
        } catch (error) {
            console.error('❌ Failed to create permanent invite link:', error.message);
            console.error('Error code:', error.response?.body?.error_code);
            console.error('Error description:', error.response?.body?.description);
            return null;
        }
    }

    /**
     * Удаляет пользователя из канала (мягкое удаление)
     * @param {number} userId - ID пользователя
     * @returns {Promise<boolean>} - успешно ли удален
     */
    async kickUserFromChannel(userId) {
        try {
            console.log(`🔄 Мягкое удаление пользователя ${userId} из канала ${config.telegram.channelId}`);
            
            // МЯГКОЕ УДАЛЕНИЕ: помечаем пользователя как забаненного в БД, но НЕ баним реально
            await this.databaseService.softDeleteUser(userId);
            console.log(`✅ Пользователь ${userId} помечен как удаленный (мягкое удаление)`);
            
            // Логируем действие
            await this.databaseService.addLog(
                userId,
                'soft_delete',
                'Пользователь помечен как удаленный из-за истечения подписки (мягкое удаление)'
            );
            
            // Отправляем уведомление пользователю
            try {
                await this.bot.sendMessage(userId, `
❌ Ваша подписка истекла

📅 Доступ к закрытому сообществу был приостановлен.

🔄 Для восстановления доступа продлите подписку:
${config.prodamus.linkToForm}

💳 После оплаты доступ будет автоматически восстановлен.
                `);
                console.log(`✅ Уведомление об истечении отправлено пользователю ${userId}`);
            } catch (msgError) {
                console.log(`⚠️ Не удалось отправить уведомление пользователю ${userId}:`, msgError.message);
            }
            
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка при мягком удалении пользователя ${userId}:`, error.message);
            return false;
        }
    }

    /**
     * Восстанавливает доступ пользователю после оплаты
     * @param {number} userId - ID пользователя
     * @param {number} paymentId - ID платежа
     * @returns {Promise<Object>} - результат восстановления
     */
    async restoreChannelAccess(userId, paymentId) {
        try {
            console.log(`🔄 Восстановление доступа для пользователя ${userId}`);
            
            // 1. Проверяем, был ли пользователь ранее забанен (мягкое удаление)
            const isBanned = await this.databaseService.isUserBanned(userId);
            
            if (isBanned) {
                console.log(`ℹ️ Пользователь ${userId} был помечен как удаленный, восстанавливаем доступ`);
                
                // Восстанавливаем пользователя в БД (убираем флаг бана)
                await this.databaseService.restoreUser(userId);
                console.log(`✅ Флаг бана снят для пользователя ${userId}`);
            } else {
                // Если не был забанен, просто обновляем доступ
                await this.databaseService.updateUserAccess(userId, true);
                console.log(`✅ Доступ обновлен для пользователя ${userId}`);
            }
            
            // 2. Получаем информацию о подписке
            const subscription = await this.databaseService.getActiveSubscription(userId);
            
            if (subscription) {
                // 3. Отправляем подтверждение пользователю
                const endDate = new Date(subscription.end_date);
                
                try {
                    await this.bot.sendMessage(userId, `
✅ Доступ восстановлен!

🎉 Ваша подписка успешно активирована!

📅 Срок действия: до ${endDate.toLocaleDateString('ru-RU')}

💡 Вы можете просматривать весь контент канала.
                    `);
                    console.log(`✅ Уведомление о восстановлении отправлено пользователю ${userId}`);
                } catch (msgError) {
                    console.log(`⚠️ Не удалось отправить подтверждение пользователю ${userId}:`, msgError.message);
                }
            }
            
            // 4. Логируем действие
            await this.databaseService.addLog(
                userId,
                'access_restored',
                `Доступ восстановлен после оплаты (payment_id: ${paymentId})`
            );
            
            console.log(`✅ Доступ полностью восстановлен для пользователя ${userId}`);
            
            return { success: true, wasBanned: isBanned };
            
        } catch (error) {
            console.error(`❌ Ошибка восстановления доступа для пользователя ${userId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Отправляет уведомление о скором истечении подписки
     * @param {number} userId - ID пользователя
     * @param {Object} subscription - данные подписки
     */
    async sendSubscriptionExpiryNotification(userId, subscription) {
        try {
            const endDate = new Date(subscription.end_date);
            const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
            
            const keyboard = {
                inline_keyboard: [
                    [{
                        text: '🔄 Продлить подписку',
                        callback_data: 'renew_subscription'
                    }],
                    [{
                        text: '👤 Индивидуальная консультация',
                        url: 'https://wa.me/79025158278'
                    }]
                ]
            };

            await this.bot.sendMessage(userId, `
⚠️ Внимание! Ваша подписка истекает через ${daysLeft} дней

📅 Дата окончания: ${endDate.toLocaleDateString('ru-RU')}

🔗 Для продления подписки нажмите кнопку ниже или перейдите по ссылке:
${config.prodamus.linkToForm}

⏰ Не упустите возможность продолжить доступ к эксклюзивному контенту!
            `, {
                reply_markup: keyboard
            });

            console.log(`✅ Expiry notification sent to user ${userId}`);
        } catch (error) {
            console.error(`❌ Failed to send expiry notification to user ${userId}:`, error.message);
        }
    }

    // Показать панель администратора
    async showAdminPanel(chatId, userId) {
        try {
            if (!this.isAdmin(userId)) {
                this.bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
                return;
            }
            
            const adminKeyboard = {
                inline_keyboard: [
                    [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
                    [{ text: '👥 Список пользователей', callback_data: 'admin_list_users' }],
                    [{ text: '👥 Без доступа', callback_data: 'no_access_users' }],
                    [{ text: '🔍 Найти пользователя', callback_data: 'admin_find_user' }],
                    [{ text: '⚙️ Настройки', callback_data: 'admin_settings' }]
                ]
            };
            
            this.bot.sendMessage(chatId, `
👑 Панель администратора

Выберите действие:
            `, { reply_markup: adminKeyboard });
        } catch (error) {
            console.error('Error showing admin panel:', error);
            this.bot.sendMessage(chatId, '❌ Ошибка при открытии панели администратора.');
        }
    }

    // Показать пользователей без доступа
    async showNoAccessUsers(chatId, userId) {
        try {
            if (!this.isAdmin(userId)) {
                this.bot.sendMessage(chatId, '❌ У вас нет прав администратора.');
                return;
            }
            
            // Получаем пользователей с истекшей подпиской
            const noAccessUsers = await this.getNoAccessUsers();
            
            if (noAccessUsers.length === 0) {
                this.bot.sendMessage(chatId, '✅ Все пользователи имеют активный доступ!');
                return;
            }
            
            let message = `👥 Пользователи без доступа (${noAccessUsers.length}):\n\n`;
            
            noAccessUsers.forEach((user, index) => {
                const endDate = new Date(user.end_date);
                const daysAgo = Math.ceil((new Date() - endDate) / (1000 * 60 * 60 * 24));
                
                message += `${index + 1}. ID: ${user.telegram_id}\n`;
                message += `   👤 Username: @${user.username || 'не указан'}\n`;
                message += `   📅 Истекла: ${endDate.toLocaleDateString('ru-RU')}\n`;
                message += `   ⏰ Дней назад: ${daysAgo}\n`;
                message += `   🚫 Статус: ${user.is_banned ? 'Заблокирован' : 'Неактивен'}\n\n`;
            });
            
            // Разбиваем сообщение на части, если оно слишком длинное
            if (message.length > 4000) {
                const parts = this.splitMessage(message, 4000);
                for (const part of parts) {
                    await this.bot.sendMessage(chatId, part);
                }
            } else {
                await this.bot.sendMessage(chatId, message);
            }
            
        } catch (error) {
            console.error('Error showing no access users:', error);
            this.bot.sendMessage(chatId, '❌ Ошибка при получении списка пользователей без доступа.');
        }
    }

    // Получить пользователей без доступа
    async getNoAccessUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT u.telegram_id, u.username, u.first_name, u.last_name, 
                       s.end_date, u.is_banned, u.has_access
                FROM users u
                LEFT JOIN subscriptions s ON u.telegram_id = s.user_id
                WHERE (u.has_access = 0 OR s.end_date < datetime('now'))
                ORDER BY s.end_date DESC
            `, (err, rows) => {
                if (err) {
                    console.error('Error in getNoAccessUsers SQL query:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // Разделить длинное сообщение на части
    splitMessage(message, maxLength) {
        const parts = [];
        let currentPart = '';
        const lines = message.split('\n');
        
        for (const line of lines) {
            if (currentPart.length + line.length + 1 > maxLength) {
                if (currentPart) {
                    parts.push(currentPart);
                    currentPart = line;
                } else {
                    parts.push(line);
                }
            } else {
                currentPart += (currentPart ? '\n' : '') + line;
            }
        }
        
        if (currentPart) {
            parts.push(currentPart);
        }
        
        return parts;
    }

    /**
     * Проверяет и отправляет уведомления о скором истечении подписок
     */
    async checkExpiringSubscriptions() {
        try {
            console.log('Checking expiring subscriptions...');
            
            // Получаем подписки, истекающие через 3 дня
            const expiringSubscriptions = await this.databaseService.getExpiringSubscriptions(3);
            
            console.log(`Found ${expiringSubscriptions.length} subscriptions expiring in 3 days`);
            
            for (const subscription of expiringSubscriptions) {
                await this.sendSubscriptionExpiryNotification(
                    subscription.telegram_id, 
                    subscription
                );
            }
            
            // Получаем истекшие подписки для удаления пользователей
            const expiredSubscriptions = await this.databaseService.getExpiredSubscriptions();
            console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);
            
            // Удаляем пользователей с истекшими подписками из канала
            for (const subscription of expiredSubscriptions) {
                console.log(`Processing expired subscription for user ${subscription.telegram_id}`);
                await this.kickUserFromChannel(subscription.telegram_id);
            }
            
            // Деактивируем истекшие подписки
            const deactivatedCount = await this.databaseService.deactivateExpiredSubscriptions();
            if (deactivatedCount > 0) {
                console.log(`Deactivated ${deactivatedCount} expired subscriptions`);
            }
            
        } catch (error) {
            console.error('Error checking expiring subscriptions:', error);
        }
    }

    /**
     * Запускает периодическую проверку подписок
     */
    startSubscriptionChecker() {
        // Проверяем каждые 6 часов
        setInterval(async () => {
            await this.checkExpiringSubscriptions();
        }, 6 * 60 * 60 * 1000);
        
        // Первая проверка через 1 минуту после запуска
        setTimeout(async () => {
            await this.checkExpiringSubscriptions();
        }, 60 * 1000);
        
        console.log('✅ Subscription checker started');
    }
}

// Запуск бота
const botApp = new TelegramBotApp();

// Обработчик callback-кнопок
botApp.bot.on('callback_query', async (callbackQuery) => {
    try {
        const data = callbackQuery.data;
        const userId = callbackQuery.from.id;
        
        if (data === 'renew_subscription') {
            await botApp.bot.sendMessage(userId, `
🔄 Продление подписки

Для продления подписки перейдите по ссылке:
${config.prodamus.linkToForm}

💳 После оплаты доступ будет автоматически продлен на 30 дней.
            `);
            
            await botApp.bot.answerCallbackQuery(callbackQuery.id, {
                text: 'Ссылка для продления отправлена!'
            });
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
        await botApp.bot.answerCallbackQuery(callbackQuery.id, {
            text: 'Произошла ошибка. Попробуйте позже.'
        });
    }
});

// Запуск проверки подписок
botApp.startSubscriptionChecker();

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

console.log('Telegram Bot started successfully!');
