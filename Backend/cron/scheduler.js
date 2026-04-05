import cron from 'node-cron';
import { runAllScrapers } from '../services/scraperService.js';

export const initSchedulers = () => {
    // Run at midnight every day
    cron.schedule('0 0 * * *', async () => {
        console.log("[Scheduler] Scheduled scraper execution started...");
        await runAllScrapers();
        console.log("[Scheduler] Scheduled scraper execution finished.");
    });
    console.log("Cron schedulers initialized.");
};
