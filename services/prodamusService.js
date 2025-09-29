const Hmac = require('../Hmac');
const config = require('../config');

class ProdamusService {
    /**
     * Создает платежную ссылку для Prodamus
     * @param {Object} paymentData - данные платежа
     * @returns {string} - ссылка для оплаты
     */
    static createPaymentLink(paymentData) {
        try {
            // Проверяем обязательные параметры
            if (!paymentData.order_id) {
                throw new Error('order_id is required');
            }
            if (!paymentData.products) {
                throw new Error('products is required');
            }
            if (!config.prodamus.secretKey) {
                throw new Error('PRODAMUS_SECRET_KEY is not configured');
            }
            if (!config.prodamus.linkToForm) {
                throw new Error('PRODAMUS_LINK_TO_FORM is not configured');
            }

            // Согласно документации Prodamus, используем do=link для получения короткой ссылки
            const data = {
                do: 'link', // Изменено с 'pay' на 'link' согласно документации
                sys: paymentData.sys || 'telegram',
                customer_email: paymentData.customer_email || '',
                customer_phone: paymentData.customer_phone || '',
                order_id: paymentData.order_id,
                products: paymentData.products,
                payment_method: paymentData.payment_method || 'AC',
                npd_income_type: paymentData.npd_income_type || 'FROM_INDIVIDUAL',
                link_expired: paymentData.link_expired || this.getExpiredDate(),
                paid_content: paymentData.paid_content || 'Спасибо за оплату! Доступ к каналу будет предоставлен автоматически.'
            };

            // Создаем подпись БЕЗ параметра signature (согласно документации)
            const signature = Hmac.create(data, config.prodamus.secretKey);
            
            // Добавляем подпись в данные для URL
            data.signature = signature;

            // Формируем URL
            const queryString = Object.keys(data)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                .join('&');

            const finalUrl = `${config.prodamus.linkToForm}?${queryString}`;
            
            // Проверяем, что подпись добавлена в URL
            const url = new URL(finalUrl);
            const signatureInUrl = url.searchParams.get('signature');
            if (!signatureInUrl) {
                throw new Error('Signature was not added to URL');
            }

            return finalUrl;

        } catch (error) {
            console.error('Error creating Prodamus payment link:', error);
            throw error;
        }
    }

    /**
     * Создает развернутую ссылку с параметрами (альтернативный метод)
     * @param {Object} paymentData - данные платежа
     * @returns {string} - развернутая ссылка для оплаты
     */
    static createExpandedPaymentLink(paymentData) {
        try {
            // Проверяем обязательные параметры
            if (!paymentData.order_id) {
                throw new Error('order_id is required');
            }
            if (!paymentData.products) {
                throw new Error('products is required');
            }

            // Создаем развернутую ссылку согласно документации
            const baseUrl = config.prodamus.linkToForm.replace('/pay', '');
            const params = {
                order_id: paymentData.order_id,
                customer_phone: paymentData.customer_phone || '',
                products: paymentData.products,
                customer_extra: paymentData.customer_extra || '',
                do: 'pay'
            };

            // Формируем URL с параметрами
            const queryString = Object.keys(params)
                .filter(key => params[key] !== '')
                .map(key => {
                    if (key === 'products') {
                        // Обрабатываем products как массив
                        const products = JSON.parse(params[key]);
                        return products.map((product, index) => 
                            `products[${index}][price]=${product.price}&products[${index}][quantity]=${product.quantity}&products[${index}][name]=${encodeURIComponent(product.name)}`
                        ).join('&');
                    }
                    return `${key}=${encodeURIComponent(params[key])}`;
                })
                .join('&');

            return `${baseUrl}/?${queryString}`;

        } catch (error) {
            console.error('Error creating expanded Prodamus payment link:', error);
            throw error;
        }
    }

    /**
     * Проверяет подпись webhook от Prodamus
     * @param {Object} data - данные webhook
     * @param {string} signature - подпись из заголовков
     * @returns {boolean} - результат проверки
     */
    static verifyWebhookSignature(data, signature) {
        try {
            return Hmac.verify(data, config.prodamus.secretKey, signature);
        } catch (error) {
            console.error('Error verifying Prodamus webhook signature:', error);
            return false;
        }
    }

    /**
     * Получает дату истечения ссылки (24 часа с текущего момента)
     * @returns {string} - дата в формате дд.мм.гггг чч:мм
     */
    static getExpiredDate() {
        const now = new Date();
        const expired = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // +24 часа
        
        const day = expired.getDate().toString().padStart(2, '0');
        const month = (expired.getMonth() + 1).toString().padStart(2, '0');
        const year = expired.getFullYear();
        const hours = expired.getHours().toString().padStart(2, '0');
        const minutes = expired.getMinutes().toString().padStart(2, '0');
        
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    /**
     * Создает данные для платежа
     * @param {number} telegramId - ID пользователя в Telegram
     * @param {number} amount - сумма платежа
     * @param {string} productName - название товара
     * @param {string} linkType - тип ссылки: 'link' или 'expanded'
     * @returns {Object} - данные для создания платежной ссылки
     */
    static createPaymentData(telegramId, amount, productName = 'Доступ к закрытому каналу', linkType = 'link') {
        const orderId = `tg_${telegramId}_${Date.now()}`;
        
        const baseData = {
            sys: 'telegram',
            customer_email: `user_${telegramId}@telegram.local`,
            customer_phone: '',
            order_id: orderId,
            products: JSON.stringify([{
                name: productName,
                price: amount,
                quantity: 1
            }]),
            payment_method: 'AC',
            npd_income_type: 'FROM_INDIVIDUAL',
            link_expired: this.getExpiredDate(),
            paid_content: 'Спасибо за оплату! Доступ к каналу будет предоставлен автоматически.'
        };

        if (linkType === 'link') {
            return {
                ...baseData,
                do: 'link'
            };
        } else {
            return {
                ...baseData,
                do: 'pay',
                customer_extra: 'Полная оплата за доступ к каналу'
            };
        }
    }

    /**
     * Проверяет статус платежа через API Prodamus
     * @param {string} orderId - ID заказа
     * @returns {Promise<Object>} - статус платежа
     */
    static async checkPaymentStatus(orderId) {
        try {
            const https = require('https');

            // Параметры для запроса статуса
            const data = {
                do: 'status',
                order_id: orderId
            };

            // Создаем подпись
            const signature = Hmac.create(data, config.prodamus.secretKey);
            data.signature = signature;

            // Формируем URL для запроса
            const queryString = Object.keys(data)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                .join('&');

            const apiUrl = `${config.prodamus.linkToForm}?${queryString}`;
            
            console.log('Checking payment status for order:', orderId);
            console.log('API URL:', apiUrl);

            return new Promise((resolve, reject) => {
                const url = new URL(apiUrl);
                const options = {
                    hostname: url.hostname,
                    port: url.port || 443,
                    path: url.pathname + url.search,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'TelegramBot/1.0',
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                };

                const req = https.request(options, (res) => {
                    let responseData = '';

                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });

                    res.on('end', () => {
                        try {
                            console.log('API Response:', responseData.substring(0, 200) + '...');
                            
                            // Проверяем, является ли ответ JSON
                            if (responseData.trim().startsWith('{') || responseData.trim().startsWith('[')) {
                                const response = JSON.parse(responseData);
                                
                                resolve({
                                    success: true,
                                    data: response,
                                    status: response.payment_status || response.status,
                                    isPaid: (response.payment_status === 'success' || response.status === 'success')
                                });
                            } else {
                                // Если не JSON, возвращаем ошибку
                                console.log('API returned HTML instead of JSON');
                                resolve({
                                    success: false,
                                    error: 'API returned HTML instead of JSON',
                                    data: null,
                                    status: 'unknown',
                                    isPaid: false
                                });
                            }
                        } catch (parseError) {
                            console.error('Error parsing API response:', parseError);
                            resolve({
                                success: false,
                                error: 'Failed to parse response',
                                data: null,
                                status: 'unknown',
                                isPaid: false
                            });
                        }
                    });
                });

                req.on('error', (error) => {
                    console.error('Error making API request:', error);
                    reject(error);
                });

                req.setTimeout(10000, () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });

                req.end();
            });

        } catch (error) {
            console.error('Error checking payment status:', error);
            throw error;
        }
    }

    /**
     * Обрабатывает webhook от Prodamus
     * @param {Object} webhookData - данные webhook
     * @returns {Object} - обработанные данные
     */
    static processWebhook(webhookData) {
        try {
            const {
                order_id,
                status,
                amount,
                customer_email,
                products
            } = webhookData;

            // Извлекаем telegram_id из order_id
            const telegramId = order_id ? order_id.split('_')[1] : null;

            return {
                telegramId: telegramId ? parseInt(telegramId) : null,
                orderId: order_id,
                status: status,
                amount: parseFloat(amount) || 0,
                customerEmail: customer_email,
                products: products,
                isSuccess: status === 'success'
            };

        } catch (error) {
            console.error('Error processing Prodamus webhook:', error);
            throw error;
        }
    }
}

module.exports = ProdamusService;
