const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Список пользователей для добавления
const users = [
    { telegram_id: 986159861, username: 'yulia_aleks', first_name: 'Yulia', created_at: '2025-09-19' },
    { telegram_id: 757073486, username: 'Tolkacheva_Alina', first_name: 'Алина', created_at: '2025-09-19' },
    { telegram_id: 5296261696, username: 'alinabykova88', first_name: 'Alina', created_at: '2025-09-19' },
    { telegram_id: 1522331215, username: 'AnastasiaDruzhinina25', first_name: 'Anastasia 🖤', created_at: '2025-09-22' },
    { telegram_id: 477583663, username: 'llosevaaa', first_name: '𝓙𝓾𝓵𝓲🩶', created_at: '2025-09-19' },
    { telegram_id: 1099251026, username: 'Byk_Lana', first_name: 'Лана', created_at: '2025-09-19' },
    { telegram_id: 7973542905, username: 'stayaWAW', first_name: 'Ольга 🃏', created_at: '2025-09-23' },
    { telegram_id: 1291454597, username: 'Taya1989', first_name: 'Тая', created_at: '2025-09-19' },
    // Добавьте сюда своих пользователей
];

console.log(`=== Импорт ${users.length} пользователей ===`);

const dbPath = path.join(__dirname, 'bot.db');
const db = new sqlite3.Database(dbPath);

const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (
        telegram_id, 
        username, 
        first_name, 
        has_access, 
        created_at,
        updated_at
    ) VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
`);

let added = 0;
let skipped = 0;

users.forEach((user, index) => {
    stmt.run([
        user.telegram_id,
        user.username,
        user.first_name,
        user.created_at
    ], function(err) {
        if (err) {
            console.log(`❌ Ошибка добавления ${user.username}:`, err.message);
        } else if (this.changes > 0) {
            added++;
            console.log(`✅ ${index + 1}. Добавлен: @${user.username} (ID: ${user.telegram_id})`);
        } else {
            skipped++;
            console.log(`ℹ️  ${index + 1}. Пропущен: @${user.username} (уже существует)`);
        }
        
        // Если это последний пользователь
        if (index === users.length - 1) {
            stmt.finalize(() => {
                console.log('\n=== Результаты импорта ===');
                console.log(`✅ Добавлено: ${added}`);
                console.log(`ℹ️  Пропущено: ${skipped}`);
                console.log(`📊 Всего: ${users.length}`);
                db.close();
            });
        }
    });
});