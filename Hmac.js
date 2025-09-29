const crypto = require('crypto');

class Hmac {
    /**
     * Создает подпись для данных
     * @param {Object} data - данные для подписи
     * @param {string} secretKey - секретный ключ
     * @returns {string} - подпись
     */
    static create(data, secretKey) {
        // Сортируем ключи для консистентности
        const sortedKeys = Object.keys(data).sort();
        const queryString = sortedKeys
            .map(key => `${key}=${data[key]}`)
            .join('&');
        
        // Создаем HMAC-SHA256 подпись
        return crypto
            .createHmac('sha256', secretKey)
            .update(queryString)
            .digest('hex');
    }

    /**
     * Проверяет подпись
     * @param {Object} data - данные для проверки
     * @param {string} secretKey - секретный ключ
     * @param {string} signature - подпись для проверки
     * @returns {boolean} - результат проверки
     */
    static verify(data, secretKey, signature) {
        const expectedSignature = this.create(data, secretKey);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }
}

module.exports = Hmac;