/**
 * Миграция: добавление поля is_banned в таблицу users
 * Для реализации мягкого удаления пользователей
 */

const sqlite3 = require('sqlite3').verbose();
const config = require('./config');

console.log('🔄 Запуск миграции базы данных...');
console.log(`📁 Путь к БД: ${config.database.path}`);

const db = new sqlite3.Database(config.database.path);

db.serialize(() => {
    // Проверяем, существует ли уже поле is_banned
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error('❌ Ошибка при получении структуры таблицы:', err);
            db.close();
            process.exit(1);
        }

        const hasBannedField = columns.some(col => col.name === 'is_banned');

        if (hasBannedField) {
            console.log('✅ Поле is_banned уже существует в таблице users');
            console.log('ℹ️  Миграция не требуется');
            db.close();
            process.exit(0);
        }

        console.log('📝 Добавление поля is_banned в таблицу users...');

        // Добавляем поле is_banned
        db.run(`
            ALTER TABLE users 
            ADD COLUMN is_banned BOOLEAN DEFAULT FALSE
        `, (err) => {
            if (err) {
                console.error('❌ Ошибка при добавлении поля is_banned:', err);
                db.close();
                process.exit(1);
            }

            console.log('✅ Поле is_banned успешно добавлено');

            // Проверяем результат
            db.all("PRAGMA table_info(users)", (err, updatedColumns) => {
                if (err) {
                    console.error('❌ Ошибка при проверке обновленной структуры:', err);
                    db.close();
                    process.exit(1);
                }

                console.log('\n📊 Обновленная структура таблицы users:');
                updatedColumns.forEach(col => {
                    console.log(`  - ${col.name} (${col.type}) ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
                });

                // Проверяем количество записей, которые будут затронуты
                db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
                    if (err) {
                        console.error('❌ Ошибка при подсчете записей:', err);
                    } else {
                        console.log(`\n📈 Всего пользователей в БД: ${row.count}`);
                        console.log(`ℹ️  Для всех пользователей is_banned установлено в FALSE по умолчанию`);
                    }

                    console.log('\n✅ Миграция успешно завершена!');
                    console.log('🚀 Теперь можно запускать бота с поддержкой мягкого удаления');
                    
                    db.close();
                    process.exit(0);
                });
            });
        });
    });
});

// Обработка ошибок
db.on('error', (err) => {
    console.error('❌ Критическая ошибка базы данных:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Необработанное исключение:', err);
    process.exit(1);
});

