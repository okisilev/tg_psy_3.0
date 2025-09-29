require('dotenv').config();

module.exports = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID
  },
  prodamus: {
    secretKey: process.env.PRODAMUS_SECRET_KEY,
    linkToForm: process.env.PRODAMUS_LINK_TO_FORM,
    webhookUrl: process.env.PRODAMUS_WEBHOOK_URL
  },
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  database: {
    path: process.env.DATABASE_PATH || './bot.db'
  }
};
