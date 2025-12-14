import path from 'path';
import puppeteer from 'puppeteer';
import { createLogger } from './logger';
import { TelegramService } from './telegram';
import { authenticate } from './auth';
import { startSearchLoop, Controller, SearchConfig } from './search';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const logger = createLogger();

const CONFIG: SearchConfig = {
    cronInterval: Number(process.env.SEARCH_INTERVAL_MINUTES) || 1,
    headless: process.env.HEADLESS === 'true',
    targetString: process.env.TARGET_STRING || 'Nessun medico trovato',
};

async function main() {
    logger.info('Starting Medico Finder Application...');

    const telegram = new TelegramService(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID, logger);
    await telegram.sendMessage('🤖 Medico Finder Bot Started.');

    let browser;
    try {
        logger.info('Launching Browser...');
        browser = await puppeteer.launch({
            headless: CONFIG.headless,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,1024'],
            defaultViewport: null,
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1024 });

        logger.info('Starting Authentication...');
        if (!await authenticate(page, telegram, logger)) {
            logger.error('Authentication failed.');
            await telegram.sendMessage('❌ Authentication failed. Exiting.');
            process.exit(1);
        }

        const controller: Controller = { 
            isRunning: true, 
            stop: () => { controller.isRunning = false; }, 
            start: () => { controller.isRunning = true; } 
        };

        setupTelegramCommands(telegram, controller, logger);

        logger.info('Authentication successful. Starting Search Loop...');
        await telegram.sendMessage('✅ Authentication successful. Loop starting.\nCommands: /stop, /start, /status, /restart');

        await startSearchLoop(page, telegram, logger, CONFIG, controller);

    } catch (error: any) {
        logger.error('Fatal Error:', error);
        await telegram.sendMessage(`❌ Fatal Error: ${error.message}`);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
}

function setupTelegramCommands(telegram: TelegramService, controller: Controller, logger: winston.Logger) {
    telegram.setupCommands({
        stop: async (ctx: any) => {
            if (!controller.isRunning) return ctx.reply('already stopped.');
            controller.stop();
            await ctx.reply('🛑 Stopping search loop...');
            logger.info('Loop stopped via Telegram.');
        },
        start: async (ctx: any) => {
            if (controller.isRunning) return ctx.reply('already running.');
            controller.start();
            await ctx.reply('▶️ Resuming search loop...');
            logger.info('Loop resumed via Telegram.');
        },
        status: async (ctx: any) => ctx.reply(`ℹ️ Status: ${controller.isRunning ? 'RUNNING 🟢' : 'STOPPED 🔴'}`),
        restart: async (ctx: any) => {
            await ctx.reply('🔄 Restarting...');
            process.exit(0);
        }
    });
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main();
