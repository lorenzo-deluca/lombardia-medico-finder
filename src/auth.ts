import fs from 'fs-extra';
import path from 'path';
import { Page, Protocol } from 'puppeteer';
import { TelegramService } from './telegram';
import winston from 'winston';

const COOKIES_PATH = path.join(process.cwd(), 'cookies', 'session.json');
const LOGIN_URL = process.env.LOGIN_URL || 'https://www.fascicolosanitario.regione.lombardia.it/';
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

export async function authenticate(page: Page, telegram: TelegramService, logger: winston.Logger): Promise<boolean> {
    await fs.ensureDir(path.dirname(COOKIES_PATH));

    if (await fs.pathExists(COOKIES_PATH)) {
        logger.info('Loading existing cookies...');
        try {
            const cookies = await fs.readJson(COOKIES_PATH);
            await page.setCookie(...(cookies as any[]));
            logger.info('Cookies loaded.');
            return true;
        } catch (error) {
            logger.error('Failed to load cookies:', error);
        }
    } else {
        logger.info('No existing cookies found.');
    }

    logger.info('Starting manual login flow.');
    await telegram.sendMessage('⚠️ Authentication required! Please log in via VNC within 5 minutes.');

    try {
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
        logger.info(`Please log in manually at ${LOGIN_URL}`);

        const loggedInSelector = process.env.LOGGED_IN_SELECTOR || 'a[href*="logout"], button[aria-label="Esci"], .user-profile';
        await page.waitForSelector(loggedInSelector, { timeout: AUTH_TIMEOUT_MS });

        logger.info('Login detected! Saving session...');
        
        const cookies = await page.cookies();
        await fs.writeJson(COOKIES_PATH, cookies, { spaces: 2 });
        
        return true;
    } catch (error) {
        logger.error('Authentication timed out or failed:', error);
        return false;
    }
}
