const sqlite3 = require('sqlite3').verbose();
const config = require('../config');

class DatabaseService {
    constructor() {
        this.db = new sqlite3.Database(config.database.path);
        this.initializeTables();
    }

    /**
     * Инициализирует таблицы базы данных
     */
    initializeTables() {
        this.db.serialize(() => {
            // Таблица пользователей
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER UNIQUE,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    has_access BOOLEAN DEFAULT FALSE,
                    is_banned BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Таблица платежей
            this.db.run(`
                CREATE TABLE IF NOT EXISTS payments (
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

            // Таблица подписок
            this.db.run(`
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER,
                    payment_id INTEGER,
                    start_date DATETIME,
                    end_date DATETIME,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id),
                    FOREIGN KEY (payment_id) REFERENCES payments (id)
                )
            `);

            // Таблица логов
            this.db.run(`
                CREATE TABLE IF NOT EXISTS logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER,
                    action TEXT,
                    details TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
        });
    }

    /**
     * Сохраняет пользователя в базу данных
     * @param {number} telegramId - ID пользователя в Telegram
     * @param {string} username - имя пользователя
     * @param {string} firstName - имя
     * @param {string} lastName - фамилия
     * @returns {Promise<number>} - ID созданной записи
     */
    async saveUser(telegramId, username, firstName, lastName) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO users (telegram_id, username, first_name, last_name, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
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

    /**
     * Получает пользователя по Telegram ID
     * @param {number} telegramId - ID пользователя в Telegram
     * @returns {Promise<Object|null>} - данные пользователя
     */
    async getUser(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE telegram_id = ?',
                [telegramId],
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

    /**
     * Обновляет статус доступа пользователя
     * @param {number} telegramId - ID пользователя в Telegram
     * @param {boolean} hasAccess - есть ли доступ
     * @returns {Promise<number>} - количество обновленных записей
     */
    async updateUserAccess(telegramId, hasAccess) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET has_access = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
                [hasAccess, telegramId],
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

    /**
     * Сохраняет информацию о платеже
     * @param {number} telegramId - ID пользователя в Telegram
     * @param {string} orderId - ID заказа
     * @param {string} orderNum - номер заказа
     * @param {number} amount - сумма
     * @param {string} status - статус платежа
     * @param {string} customerEmail - email клиента
     * @param {string} customerPhone - телефон клиента
     * @returns {Promise<number>} - ID созданной записи
     */
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

    /**
     * Получает последний платеж пользователя
     * @param {number} telegramId - ID пользователя в Telegram
     * @returns {Promise<Object|null>} - данные платежа
     */
    async getUserPayment(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM payments WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1',
                [telegramId],
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

    /**
     * Получает все платежи пользователя
     * @param {number} telegramId - ID пользователя в Telegram
     * @returns {Promise<Array>} - список платежей
     */
    async getUserPayments(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM payments WHERE telegram_id = ? ORDER BY created_at DESC',
                [telegramId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    /**
     * Получает всех пользователей с доступом
     * @returns {Promise<Array>} - список пользователей
     */
    async getUsersWithAccess() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM users WHERE has_access = TRUE ORDER BY created_at DESC',
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    /**
     * Получает статистику
     * @returns {Promise<Object>} - статистика
     */
    async getStatistics() {
        return new Promise((resolve, reject) => {
            const stats = {};
            
            // Общее количество пользователей
            this.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                stats.totalUsers = row.count;
                
                // Пользователи с доступом
                this.db.get('SELECT COUNT(*) as count FROM users WHERE has_access = TRUE', (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    stats.usersWithAccess = row.count;
                    
                    // Общее количество платежей
                    this.db.get('SELECT COUNT(*) as count FROM payments', (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        stats.totalPayments = row.count;
                        
                        // Успешные платежи
                        this.db.get('SELECT COUNT(*) as count FROM payments WHERE status = "success"', (err, row) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            stats.successfulPayments = row.count;
                            
                            // Общая сумма
                            this.db.get('SELECT SUM(amount) as total FROM payments WHERE status = "success"', (err, row) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                stats.totalAmount = row.total || 0;
                                
                                resolve(stats);
                            });
                        });
                    });
                });
            });
        });
    }

    /**
     * Добавляет запись в лог
     * @param {number} telegramId - ID пользователя в Telegram
     * @param {string} action - действие
     * @param {string} details - детали
     * @returns {Promise<number>} - ID созданной записи
     */
    async addLog(telegramId, action, details) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO logs (telegram_id, action, details)
                VALUES (?, ?, ?)
            `);
            
            stmt.run([telegramId, action, details], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }

    /**
     * Создает подписку для пользователя
     * @param {number} telegramId - ID пользователя в Telegram
     * @param {number} paymentId - ID платежа
     * @param {number} durationDays - продолжительность подписки в днях
     * @returns {Promise<number>} - ID созданной подписки
     */
    async createSubscription(telegramId, paymentId, durationDays = 30) {
        return new Promise((resolve, reject) => {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + durationDays);
            
            const stmt = this.db.prepare(`
                INSERT INTO subscriptions (user_id, payment_id, start_date, end_date, is_active)
                VALUES (?, ?, ?, ?, TRUE)
            `);
            
            stmt.run([telegramId, paymentId, startDate.toISOString(), endDate.toISOString()], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }

    /**
     * Получает активную подписку пользователя
     * @param {number} telegramId - ID пользователя в Telegram
     * @returns {Promise<Object|null>} - данные активной подписки
     */
    async getActiveSubscription(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM subscriptions 
                WHERE telegram_id = ? AND is_active = TRUE AND end_date > datetime('now')
                ORDER BY end_date DESC LIMIT 1
            `, [telegramId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Проверяет, есть ли у пользователя активная подписка
     * @param {number} telegramId - ID пользователя в Telegram
     * @returns {Promise<boolean>} - есть ли активная подписка
     */
    async hasActiveSubscription(telegramId) {
        const subscription = await this.getActiveSubscription(telegramId);
        return subscription !== null;
    }

    /**
     * Получает подписки, истекающие через указанное количество дней
     * @param {number} days - количество дней до истечения
     * @returns {Promise<Array>} - список подписок
     */
    async getExpiringSubscriptions(days) {
        return new Promise((resolve, reject) => {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            
            this.db.all(`
                SELECT s.*, u.first_name, u.username 
                FROM subscriptions s
                JOIN users u ON s.user_id = u.telegram_id
                WHERE s.is_active = TRUE 
                AND DATE(s.end_date) = DATE(?)
                ORDER BY s.end_date ASC
            `, [targetDate.toISOString().split('T')[0]], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Получает истекшие подписки (для удаления пользователей из канала)
     * @returns {Promise<Array>} - список истекших подписок
     */
    async getExpiredSubscriptions() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT s.*, u.first_name, u.username 
                FROM subscriptions s
                JOIN users u ON s.user_id = u.telegram_id
                WHERE s.is_active = TRUE 
                AND s.end_date <= datetime('now')
                ORDER BY s.end_date ASC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Деактивирует истекшие подписки
     * @returns {Promise<number>} - количество деактивированных подписок
     */
    async deactivateExpiredSubscriptions() {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE subscriptions 
                SET is_active = FALSE 
                WHERE is_active = TRUE AND end_date <= datetime('now')
            `, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * Обновляет статус доступа пользователя на основе подписки
     * @param {number} telegramId - ID пользователя в Telegram
     * @returns {Promise<boolean>} - обновлен ли статус
     */
    async updateUserAccessFromSubscription(telegramId) {
        const hasActiveSubscription = await this.hasActiveSubscription(telegramId);
        await this.updateUserAccess(telegramId, hasActiveSubscription);
        return hasActiveSubscription;
    }

    /**
     * Помечает пользователя как забаненного (мягкое удаление)
     * @param {number} telegramId - ID пользователя в Telegram
     * @returns {Promise<number>} - количество обновленных записей
     */
    async softDeleteUser(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET is_banned = TRUE, has_access = FALSE, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
                [telegramId],
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

    /**
     * Восстанавливает пользователя (убирает флаг бана)
     * @param {number} telegramId - ID пользователя в Telegram
     * @returns {Promise<number>} - количество обновленных записей
     */
    async restoreUser(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET is_banned = FALSE, has_access = TRUE, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
                [telegramId],
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

    /**
     * Проверяет, забанен ли пользователь
     * @param {number} telegramId - ID пользователя в Telegram
     * @returns {Promise<boolean>} - забанен ли пользователь
     */
    async isUserBanned(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT is_banned FROM users WHERE telegram_id = ?',
                [telegramId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row ? row.is_banned === 1 : false);
                    }
                }
            );
        });
    }

    /**
     * Закрывает соединение с базой данных
     */
    close() {
        this.db.close();
    }
}

module.exports = DatabaseService;
