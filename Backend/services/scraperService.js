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

export const fetchRemotiveJobs = async () => {
    console.log("[Aggregator] Starting Remotive API scan...");
    try {
        // Remotive API is free and requires no keys
        const { data } = await axios.get('https://remotive.com/api/remote-jobs?limit=10');
        
        let newJobsCount = 0;
        for (const jobData of data.jobs) {
            const sourceUrl = jobData.url;
            const existing = await Job.findOne({ sourceUrl });
            if (existing) continue;

            const companyId = await getOrCreateCompany(jobData.company_name);

            await Job.create({
                title: jobData.title,
                description: jobData.description.replace(/<[^>]+>/g, '').substring(0, 500) + '...',
                requirements: jobData.tags || ["Remote"],
                salary: 0, // Remotive usually buries salary in text
                location: jobData.candidate_required_location || "Remote/Global",
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
            const existing = await Job.findOne({ sourceUrl });
            if (existing) continue;

            const companyId = await getOrCreateCompany(jobData.company_name);

            await Job.create({
                title: jobData.title,
                description: jobData.description.replace(/<[^>]+>/g, '').substring(0, 500) + '...',
                requirements: jobData.tags || [],
                salary: 0,
                location: jobData.location || "Global Remote",
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
    await fetchRemotiveJobs();
    await fetchArbeitNowJobs();
    
    /* 
    Add future APIs here. Examples:
    await fetchAdzunaJobs(process.env.ADZUNA_APP_ID, process.env.ADZUNA_APP_KEY);
    await fetchJoobleJobs(process.env.JOOBLE_API_KEY);
    */
};
