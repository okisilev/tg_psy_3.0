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
                    amount REAL,
                    status TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
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
     * @param {number} amount - сумма
     * @param {string} status - статус платежа
     * @returns {Promise<number>} - ID созданной записи
     */
    async savePayment(telegramId, orderId, amount, status) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO payments (telegram_id, order_id, amount, status)
                VALUES (?, ?, ?, ?)
            `);
            
            stmt.run([telegramId, orderId, amount, status], function(err) {
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
     * Закрывает соединение с базой данных
     */
    close() {
        this.db.close();
    }
}

module.exports = DatabaseService;
