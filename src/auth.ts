import fs from 'fs-extra';
import path from 'path';
import { Page, Protocol } from 'puppeteer';
import { TelegramService } from './telegram';
import winston from 'winston';

const COOKIES_PATH = path.join(process.cwd(), 'cookies', 'session.json');
const LOGIN_URL = process.env.LOGIN_URL || 'https://www.fascicolosanitario.regione.lombardia.it/';
const SEARCH_URL = process.env.SEARCH_URL || 'https://www.fascicolosanitario.regione.lombardia.it/web/areaprivata/cambio-medico';
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

export async function authenticate(page: Page, telegram: TelegramService, logger: winston.Logger): Promise<boolean> {
    await fs.ensureDir(path.dirname(COOKIES_PATH));

    if (await fs.pathExists(COOKIES_PATH)) {
        logger.info('Loading existing cookies...');
        try {
            const cookies = await fs.readJson(COOKIES_PATH);
            await page.setCookie(...(cookies as any[]));
            logger.info('Cookies loaded. Verifying session...');

            // Verify if cookies are still valid
            await page.goto(SEARCH_URL, { waitUntil: 'networkidle2' });
            const loggedInSelector = process.env.LOGGED_IN_SELECTOR || 'a[href*="logout"], button[aria-label="Esci"], .user-profile';
            
            try {
                await page.waitForSelector(loggedInSelector, { timeout: 10000 }); // Fast check
                logger.info('Session verified! Logged in automatically.');
                return true;
            } catch (validationError) {
                logger.warn('Session invalid or expired. Deleting cookies and enforcing manual login.');
                await fs.remove(COOKIES_PATH);
            }

        } catch (error) {
            logger.error('Failed to load/verify cookies:', error);
            await fs.remove(COOKIES_PATH); // Ensure cleanup on error
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
