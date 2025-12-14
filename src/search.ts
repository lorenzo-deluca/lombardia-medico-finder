import path from 'path';
import fs from 'fs-extra';
import { Page } from 'puppeteer';
import winston from 'winston';
import { TelegramService } from './telegram';

export interface SearchConfig {
    cronInterval: number;
    headless: boolean;
    targetString: string;
}

export interface Controller {
    isRunning: boolean;
    stop: () => void;
    start: () => void;
}

export async function startSearchLoop(
    page: Page,
    telegram: TelegramService,
    logger: winston.Logger,
    config: SearchConfig,
    controller: Controller
): Promise<void> {
    const SEARCH_URL = process.env.SEARCH_URL || 'https://www.fascicolosanitario.regione.lombardia.it/web/areaprivata/cambio-medico';
    const SELECTOR_MUNICIPALITY = '#comune';
    const SELECTOR_SEARCH_BUTTON = '#buttonFormRicercaComune';
    const NO_DOCTORS_FOUND_TEXT = 'Non sono stati trovati medici disponibili';
    const MAX_CONSECUTIVE_ERRORS = 5;

    let isFirstRun = true;
    let consecutiveErrors = 0;

    logger.info(`Starting search loop. Interval: ${config.cronInterval} minutes.`);

    while (controller?.isRunning) {
        try {
            logger.info('Running search iteration...');
            await page.goto(SEARCH_URL, { waitUntil: 'networkidle2' });
            await page.waitForSelector(SELECTOR_MUNICIPALITY, { timeout: 30000 });

            if (isFirstRun) {
                const startupScreenshotPath = await handleScreenshot(page, `startup-${Date.now()}.png`);
                await telegram.sendPhoto(startupScreenshotPath, 'ℹ️ Bot started. Checking for doctors...');
                isFirstRun = false;
            }

            const options = await page.evaluate((selector: string) => {
                const select = document.querySelector(selector) as HTMLSelectElement | null;
                if (!select) return [];
                return Array.from(select.options)
                    .map(o => ({ value: o.value, text: o.innerText.trim() }))
                    .filter(o => o.text.toLowerCase() !== 'seleziona' && o.value);
            }, SELECTOR_MUNICIPALITY);

            logger.info(`Found ${options.length} municipalities: ${options.map(o => o.text).join(', ')}`);

            for (const option of options) {
                if (!controller.isRunning) break;

                logger.info(`Checking: ${option.text}`);

                if (page.url() !== SEARCH_URL) {
                    await page.goto(SEARCH_URL, { waitUntil: 'networkidle2' });
                    await page.waitForSelector(SELECTOR_MUNICIPALITY);
                }

                await page.select(SELECTOR_MUNICIPALITY, option.value);
                
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2' }),
                    page.click(SELECTOR_SEARCH_BUTTON)
                ]);

                const content = await page.content();
                const doctorsAvailable = !content.includes(NO_DOCTORS_FOUND_TEXT);


                if (doctorsAvailable) {
                    logger.info(`MATCH FOUND for ${option.text}`);
                    const screenshotName = `match-${option.value}-${Date.now()}.png`;
                    const matchScreenshotPath = await handleScreenshot(page, screenshotName);
                    await telegram.sendPhoto(matchScreenshotPath, 
                        `🎉 DOCTOR FOUND in **${option.text}**!`, { disable_notification: false });
                } else {
                    logger.info(`No doctors found for ${option.text}`);
                }

                await new Promise(r => setTimeout(r, 2000));
            }

            consecutiveErrors = 0;

        } catch (error: any) {
            consecutiveErrors++;
            logger.error(`Search error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);

            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                logger.error('Max consecutive errors reached. Stopping.');
                await captureError(page, telegram, error);
                if (controller) controller.stop();
            }
        }

        if (controller.isRunning) {
            logger.info(`Waiting ${config.cronInterval} minutes...`);
            await new Promise(resolve => setTimeout(resolve, config.cronInterval * 60 * 1000));
        }
    }
}

async function handleScreenshot(page: Page, filename: string): Promise<string> {
    const filepath = path.join(process.cwd(), 'screenshots', filename);
    await fs.ensureDir(path.dirname(filepath));
    await page.screenshot({ path: filepath as any, fullPage: true });
    return filepath;
}

async function captureError(page: Page, telegram: TelegramService, error: Error): Promise<void> {
    try {
        const filepath = await handleScreenshot(page, `error-${Date.now()}.png`);
        await telegram.sendPhoto(filepath, `❌ **CRITICAL ERROR**: Stopping loop.\nError: ${error.message}`);
    } catch (e: any) {
        await telegram.sendMessage(`❌ **CRITICAL ERROR**: Stopping loop.\nError: ${error.message}`);
    }
}
