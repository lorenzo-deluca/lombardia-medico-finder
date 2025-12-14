require('dotenv').config();
const { Telegraf } = require('telegraf');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token || token === 'your_bot_token_here') {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN is missing or default in .env file.');
    console.error('Please edit .env and add your bot token first.');
    process.exit(1);
}

const bot = new Telegraf(token);

console.log('🤖 Bot started! Please send a message to your bot on Telegram...');

bot.on('message', (ctx) => {
    const chatId = ctx.chat.id;
    const name = ctx.chat.first_name || ctx.chat.title || 'User';

    console.log(`\n✅ Message received from ${name}!`);
    console.log(`🆔 Your Chat ID is: ${chatId}`);
    console.log('\nPlease copy this ID and paste it into your .env file as TELEGRAM_CHAT_ID.');

    process.exit(0);
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
