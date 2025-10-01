# Инструкция по обновлению бота - Мягкое удаление

## 🎯 Цель обновления

Внедрение системы мягкого удаления пользователей при истечении подписки с автоматическим восстановлением доступа при повторной оплате.

## ⚠️ Важно перед обновлением

1. **Сделайте резервную копию базы данных:**
   ```bash
   cp bot.db bot.db.backup
   ```

2. **Остановите работающего бота** (если запущен)

## 📋 Шаги по обновлению

### Шаг 1: Запустите миграцию базы данных

Миграция добавит поле `is_banned` в таблицу `users`:

```bash
node migration-add-is-banned.js
```

**Ожидаемый результат:**
```
🔄 Запуск миграции базы данных...
📁 Путь к БД: ./bot.db
📝 Добавление поля is_banned в таблицу users...
✅ Поле is_banned успешно добавлено

📊 Обновленная структура таблицы users:
  - id (INTEGER)
  - telegram_id (INTEGER)
  - username (TEXT)
  - first_name (TEXT)
  - last_name (TEXT)
  - has_access (BOOLEAN)
  - is_banned (BOOLEAN) DEFAULT FALSE
  - created_at (DATETIME)
  - updated_at (DATETIME)

📈 Всего пользователей в БД: X
ℹ️  Для всех пользователей is_banned установлено в FALSE по умолчанию

✅ Миграция успешно завершена!
🚀 Теперь можно запускать бота с поддержкой мягкого удаления
```

### Шаг 2: Проверьте обновленную структуру

Проверьте, что поле добавлено успешно:

```bash
sqlite3 bot.db "PRAGMA table_info(users);"
```

Должно быть поле: `is_banned|BOOLEAN|0||0`

### Шаг 3: Запустите бота

```bash
node bot.js
```

**Проверьте логи при запуске:**
- ✅ Конфигурация корректна
- ✅ Server running on port XXXX
- ✅ Subscription checker started
- ✅ Telegram Bot started successfully!

## 🧪 Проверка работы

### Тест 1: Проверка мягкого удаления

1. **Создайте тестовую подписку с коротким сроком:**
   ```sql
   -- Вставьте тестовую подписку, которая истекла
   INSERT INTO subscriptions (telegram_id, payment_id, start_date, end_date, is_active)
   VALUES (YOUR_TEST_USER_ID, 1, datetime('now', '-31 days'), datetime('now', '-1 days'), 1);
   ```

2. **Дождитесь автоматической проверки** (каждые 6 часов) или перезапустите бота

3. **Проверьте результат:**
   ```sql
   SELECT telegram_id, username, is_banned, has_access 
   FROM users 
   WHERE telegram_id = YOUR_TEST_USER_ID;
   ```
   
   Ожидаемый результат: `is_banned = 1`, `has_access = 0`

4. **Проверьте логи:**
   ```sql
   SELECT * FROM logs 
   WHERE telegram_id = YOUR_TEST_USER_ID 
   AND action = 'soft_delete';
   ```

### Тест 2: Проверка восстановления доступа

1. **Произведите тестовую оплату** для пользователя с `is_banned = 1`

2. **Проверьте результат:**
   ```sql
   SELECT telegram_id, username, is_banned, has_access 
   FROM users 
   WHERE telegram_id = YOUR_TEST_USER_ID;
   ```
   
   Ожидаемый результат: `is_banned = 0`, `has_access = 1`

3. **Проверьте логи восстановления:**
   ```sql
   SELECT * FROM logs 
   WHERE telegram_id = YOUR_TEST_USER_ID 
   AND action = 'access_restored';
   ```

4. **Проверьте новую подписку:**
   ```sql
   SELECT * FROM subscriptions 
   WHERE telegram_id = YOUR_TEST_USER_ID 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

## 📊 Мониторинг

### Просмотр забаненных пользователей:
```sql
SELECT 
    u.telegram_id,
    u.username,
    u.first_name,
    u.is_banned,
    u.has_access,
    u.updated_at
FROM users u
WHERE u.is_banned = TRUE
ORDER BY u.updated_at DESC;
```

### История мягких удалений:
```sql
SELECT 
    l.telegram_id,
    u.username,
    l.action,
    l.details,
    l.created_at
FROM logs l
JOIN users u ON l.telegram_id = u.telegram_id
WHERE l.action = 'soft_delete'
ORDER BY l.created_at DESC;
```

### История восстановлений:
```sql
SELECT 
    l.telegram_id,
    u.username,
    l.action,
    l.details,
    l.created_at
FROM logs l
JOIN users u ON l.telegram_id = u.telegram_id
WHERE l.action = 'access_restored'
ORDER BY l.created_at DESC;
```

## 🔄 Откат изменений (если необходимо)

Если что-то пошло не так, можно откатить изменения:

### 1. Остановите бота

### 2. Восстановите базу данных из бэкапа:
```bash
cp bot.db.backup bot.db
```

### 3. Восстановите старую версию кода:
```bash
git checkout HEAD~1 bot.js services/databaseService.js
```

## ❓ Часто задаваемые вопросы

### Q: Что произойдет с существующими пользователями после миграции?
A: Все существующие пользователи получат `is_banned = FALSE` по умолчанию. Их статус не изменится.

### Q: Потеряются ли данные при миграции?
A: Нет, миграция только добавляет новое поле. Все существующие данные сохраняются.

### Q: Как часто проверяются истекшие подписки?
A: Каждые 6 часов автоматически. Первая проверка происходит через 1 минуту после запуска бота.

### Q: Удаляются ли пользователи из канала при мягком удалении?
A: Нет! Пользователи остаются в канале, только помечаются как неактивные в базе данных.

### Q: Что происходит при повторной оплате?
A: Автоматически снимается флаг бана, восстанавливается доступ, создается новая подписка, и пользователь получает уведомление.

## 📚 Дополнительная документация

- `BOT_CHANGES.md` - Краткая сводка изменений
- `docs/SOFT_DELETE_IMPLEMENTATION.md` - Подробная техническая документация

## 🆘 Поддержка

Если возникли проблемы:
1. Проверьте логи бота
2. Проверьте структуру базы данных
3. Убедитесь, что миграция прошла успешно
4. Проверьте, что все файлы обновлены

## ✅ Чеклист обновления

- [ ] Создана резервная копия базы данных
- [ ] Бот остановлен
- [ ] Запущена миграция `migration-add-is-banned.js`
- [ ] Миграция завершена успешно
- [ ] Проверена структура таблицы users
- [ ] Бот запущен
- [ ] Проверены логи запуска
- [ ] Выполнены тесты мягкого удаления
- [ ] Выполнены тесты восстановления доступа
- [ ] Все работает корректно ✨

