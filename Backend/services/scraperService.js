import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job } from '../models/jobModel.js';
import { Company } from '../models/companyModel.js';

// Helper function to create or find a company
async function getOrCreateCompany(companyName) {
    if (!companyName) companyName = "Unknown Company";
    
    let company = await Company.findOne({ name: companyName });
    if (!company) {
        company = await Company.create({
            name: companyName,
            description: `Automated imported profile for ${companyName}`,
            location: "Kenya"
        });
    }
    return company._id;
}

// ----------------------------------------------------
// Official API Integrations
// ----------------------------------------------------

export const scrapeMyJobMag = async () => {
    console.log("[Aggregator] Starting MyJobMag Kenya scrape...");
    try {
        const { data } = await axios.get('https://www.myjobmag.co.ke/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            }
        });
        const $ = cheerio.load(data);
        
        let newJobsCount = 0;
        const jobElements = $('.job-info').toArray().slice(0, 30);
        
        for (const el of jobElements) {
            try {
                const titleElement = $(el).find('h2 a');
                const title = titleElement.text().trim();
                const relativeLink = titleElement.attr('href');
                if (!title || !relativeLink) continue;

                const sourceUrl = `https://www.myjobmag.co.ke${relativeLink}`;
                const existing = await Job.findOne({ sourceUrl });
                if (existing) continue;

                const companyName = $(el).find('.job-comp-name a').text().trim() || "MyJobMag Employer";
                let location = $(el).find('.location').text().trim() || "Nairobi, Kenya";
                if (!location.toLowerCase().includes("kenya")) location += ", Kenya";

                const companyId = await getOrCreateCompany(companyName);

                await Job.create({
                    title,
                    description: `This is an external job posting securely scraped from MyJobMag Kenya. Please apply directly via the source link.`,
                    requirements: ["Please visit source link for detailed requirements"],
                    salary: 0,
                    location: location,
                    jobType: "FullTime",
                    experienceLevel: 0,
                    position: 1,
                    company: companyId,
                    isExternal: true,
                    sourceUrl,
                    sourcePlatform: "MyJobMag"
                });
                newJobsCount++;
            } catch (innerErr) {}
        }
        console.log(`[Aggregator] MyJobMag finished. Added ${newJobsCount} new jobs.`);
    } catch (error) {
        console.error("[Aggregator] Failed to scrape MyJobMag:", error.message);
    }
};


export const fetchRemotiveJobs = async () => {
    console.log("[Aggregator] Starting Remotive API scan...");
    try {
        // Remotive API is free and requires no keys
        const { data } = await axios.get('https://remotive.com/api/remote-jobs?limit=10');
        
        let newJobsCount = 0;
        for (const jobData of data.jobs) {
            const sourceUrl = jobData.url;
            
            const fullText = (jobData.title + " " + jobData.description).toLowerCase();
            const isEnglish = fullText.includes(" the ") && fullText.includes(" and ") && fullText.includes(" to ");
            if (!isEnglish) continue;
            
            const existing = await Job.findOne({ sourceUrl });
            if (existing) continue;

            const companyId = await getOrCreateCompany(jobData.company_name);

            await Job.create({
                title: jobData.title,
                description: jobData.description.replace(/<[^>]+>/g, '').substring(0, 500) + '...',
                requirements: jobData.tags || ["Remote"],
                salary: 0, // Remotive usually buries salary in text
                location: (!jobData.candidate_required_location || jobData.candidate_required_location === "Worldwide") ? "Remote/Global (Available in Kenya)" : jobData.candidate_required_location + " (Available in Kenya)",
                jobType: jobData.job_type ? jobData.job_type.replace("_", " ") : "Remote",
                experienceLevel: 0,
                position: 1,
                company: companyId,
                isExternal: true,
                sourceUrl,
                sourcePlatform: "Remotive"
            });
            newJobsCount++;
        }
        console.log(`[Aggregator] Remotive API finished. Added ${newJobsCount} new jobs.`);
    } catch (error) {
        console.error("[Aggregator] Failed Remotive Fetch:", error.message);
    }
};

export const fetchArbeitNowJobs = async () => {
    console.log("[Aggregator] Starting ArbeitNow API scan...");
    try {
        // ArbeitNow API is extremely developer-friendly
        const { data } = await axios.get('https://www.arbeitnow.com/api/job-board-api');
        
        let newJobsCount = 0;
        const jobElements = data.data.slice(0, 10); // Grab top 10

        for (const jobData of jobElements) {
            const sourceUrl = jobData.url;

            // Language Enforcer: ArbeitNow often posts in German. Drop non-English jobs.
            const fullText = (jobData.title + " " + jobData.description).toLowerCase();
            const isEnglish = fullText.includes(" the ") && fullText.includes(" and ") && fullText.includes(" to ");
            if (!isEnglish) continue;

            const existing = await Job.findOne({ sourceUrl });
            if (existing) continue;

            const companyId = await getOrCreateCompany(jobData.company_name);

            await Job.create({
                title: jobData.title,
                description: jobData.description.replace(/<[^>]+>/g, '').substring(0, 500) + '...',
                requirements: jobData.tags || [],
                salary: 0,
                location: jobData.location ? jobData.location + " (Available in Kenya)" : "Global Remote (Available in Kenya)",
                jobType: "FullTime",
                experienceLevel: 0,
                position: 1,
                company: companyId,
                isExternal: true,
                sourceUrl,
                sourcePlatform: "ArbeitNow"
            });
            newJobsCount++;
        }
        console.log(`[Aggregator] ArbeitNow API finished. Added ${newJobsCount} new jobs.`);
    } catch (error) {
        console.error("[Aggregator] Failed ArbeitNow Fetch:", error.message);
    }
};

export const runAllScrapers = async () => {
    console.log("=== Starting Master Job Aggregation ===");
    await scrapeMyJobMag();
    await fetchRemotiveJobs();
    await fetchArbeitNowJobs();
    
    /* 
    Add future APIs here. Examples:
    await fetchAdzunaJobs(process.env.ADZUNA_APP_ID, process.env.ADZUNA_APP_KEY);
    await fetchJoobleJobs(process.env.JOOBLE_API_KEY);
    */
};
