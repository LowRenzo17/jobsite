import { runAllScrapers } from "./services/scraperService.js";
import connectDB from "./utils/db.js";
import dotenv from "dotenv";

dotenv.config();

const runTest = async () => {
    console.log("Connecting DB...");
    await connectDB();
    console.log("Running Scrapers...");
    await runAllScrapers();
    console.log("Done.");
    process.exit(0);
};

runTest();
