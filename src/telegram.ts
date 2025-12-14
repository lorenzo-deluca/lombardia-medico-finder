import { Telegraf, Context } from 'telegraf';
import winston from 'winston';

export class TelegramService {
    private bot: Telegraf<Context> | null;
    private chatId: string | undefined;
    private logger: winston.Logger;

    constructor(token: string | undefined, chatId: string | undefined, logger: winston.Logger) {
        this.logger = logger;
        
        if (!token || !chatId) {
            this.logger.warn('Telegram config missing. Notifications disabled.');
            this.bot = null;
            return;
        }

        this.bot = new Telegraf(token);
        this.chatId = chatId;

        this.bot.launch().catch(err => this.logger.error('Failed to launch bot:', err));

        process.once('SIGINT', () => this.bot?.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
    }

    setupCommands(handlers: { [key: string]: (ctx: Context) => Promise<void | unknown> }) {
        if (!this.bot) return;

        for (const [command, handler] of Object.entries(handlers)) {
            this.bot.command(command, async (ctx) => {
                if (String(ctx.chat?.id) !== String(this.chatId)) {
                    this.logger.warn(`Unauthorized command from ${ctx.chat?.id}`);
                    return;
                }

                this.logger.info(`Command: /${command}`);
                try {
                    await handler(ctx);
                } catch (error) {
                    this.logger.error(`Error in /${command}:`, error);
                    ctx.reply('❌ Error executing command.');
                }
            });
        }
    }

    async sendMessage(message: string) {
        if (!this.bot || !this.chatId) return;
        try {
            await this.bot.telegram.sendMessage(this.chatId, `[${new Date().toLocaleString()}]\n${message}`);
        } catch (error) {
            this.logger.error('Failed to send message:', error);
        }
    }

    async sendPhoto(source: string | Buffer, caption: string, options: object = {}) {
        if (!this.bot || !this.chatId) return;
        try {
            const inputFile = typeof source === 'string' ? { source: source } : { source: source };
            await this.bot.telegram.sendPhoto(this.chatId, inputFile, { 
                caption: `[${new Date().toLocaleString()}]\n${caption}`, 
                ...options 
            });
        } catch (error) {
            this.logger.error('Failed to send photo:', error);
        }
    }
}
