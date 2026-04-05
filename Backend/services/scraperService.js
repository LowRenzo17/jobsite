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

// Scraper 1: MyJobMag Kenya
export const scrapeMyJobMag = async () => {
    console.log("[Scraper] Starting MyJobMag scrape...");
    try {
        const { data } = await axios.get('https://www.myjobmag.co.ke/');
        const $ = cheerio.load(data);
        
        let newJobsCount = 0;
        
        // This selector must match the HTML structure of myjobmag.co.ke
        const jobElements = $('.job-info').toArray().slice(0, 5); // Limit to top 5 for safety
        
        for (const el of jobElements) {
            try {
                const titleElement = $(el).find('h2 a');
                const title = titleElement.text().trim();
                const relativeLink = titleElement.attr('href');
                if (!title || !relativeLink) continue;

                const sourceUrl = `https://www.myjobmag.co.ke${relativeLink}`;
                
                // Check if already exists
                const existing = await Job.findOne({ sourceUrl });
                if (existing) continue;

                // For a real app, you would fetch the internal page to grab requirements
                const companyName = $(el).find('.job-comp-name a').text().trim() || "MyJobMag Employer";
                const location = "Nairobi, Kenya"; // Default or parse from UI

                const companyId = await getOrCreateCompany(companyName);

                await Job.create({
                    title,
                    description: `This is an external job posting from MyJobMag. Please apply directly via the source link.`,
                    requirements: ["Please visit source link for requirements"],
                    salary: 0,
                    location,
                    jobType: "FullTime",
                    experienceLevel: 0,
                    position: 1,
                    company: companyId,
                    isExternal: true,
                    sourceUrl,
                    sourcePlatform: "MyJobMag"
                });
                newJobsCount++;
            } catch (innerErr) {
                console.error("[Scraper] Error parsing single MyJobMag job", innerErr);
            }
        }
        console.log(`[Scraper] MyJobMag finished. Added ${newJobsCount} new jobs.`);
    } catch (error) {
        console.error("[Scraper] Failed to scrape MyJobMag:", error.message);
    }
};

// Scraper 2: OpenedCareer
export const scrapeOpenedCareer = async () => {
    console.log("[Scraper] Starting OpenedCareer scrape...");
    try {
        const { data } = await axios.get('https://openedcareer.com/');
        const $ = cheerio.load(data);
        
        let newJobsCount = 0;
        
        // This selector must match the HTML structure of openedcareer.com
        const jobElements = $('.job-listing').toArray().slice(0, 5); // Example selector
        
        for (const el of jobElements) {
            try {
                const title = $(el).find('h3.job-title').text().trim();
                const sourceUrl = $(el).find('a').attr('href');
                if (!title || !sourceUrl) continue;

                // Check exists
                const existing = await Job.findOne({ sourceUrl });
                if (existing) continue;

                const companyName = $(el).find('.company-name').text().trim() || "OpenedCareer Employer";
                const companyId = await getOrCreateCompany(companyName);

                await Job.create({
                    title,
                    description: `This is an external job posting from OpenedCareer. Please apply directly via the source link.`,
                    requirements: [],
                    salary: 0,
                    location: "Kenya",
                    jobType: "FullTime",
                    experienceLevel: 0,
                    position: 1,
                    company: companyId,
                    isExternal: true,
                    sourceUrl,
                    sourcePlatform: "OpenedCareer"
                });
                newJobsCount++;
            } catch (e) {}
        }
        console.log(`[Scraper] OpenedCareer finished. Added ${newJobsCount} new jobs.`);
    } catch (error) {
        console.error("[Scraper] Failed to scrape OpenedCareer:", error.message);
    }
};

// Scraper 3: Official API (Remotive API as generic example, filtering by Kenya or remote)
export const fetchJobsFromApi = async () => {
    console.log("[Scraper] Starting API scan...");
    try {
        // Remotive provides a free API without keys for remote jobs, great for starting
        const { data } = await axios.get('https://remotive.com/api/remote-jobs?limit=5');
        
        let newJobsCount = 0;
        for (const jobData of data.jobs) {
            const sourceUrl = jobData.url;
            const existing = await Job.findOne({ sourceUrl });
            if (existing) continue;

            const companyId = await getOrCreateCompany(jobData.company_name);

            await Job.create({
                title: jobData.title,
                description: jobData.description.replace(/<[^>]+>/g, '').substring(0, 500) + '...',
                requirements: jobData.tags || [],
                salary: 0,
                location: jobData.candidate_required_location || "Remote",
                jobType: jobData.job_type || "Remote",
                experienceLevel: 0,
                position: 1,
                company: companyId,
                isExternal: true,
                sourceUrl,
                sourcePlatform: "Remotive API"
            });
            newJobsCount++;
        }
        console.log(`[Scraper] API finished. Added ${newJobsCount} new jobs.`);
    } catch (error) {
        console.error("[Scraper] Failed API Fetch:", error.message);
    }
};

export const runAllScrapers = async () => {
    await scrapeMyJobMag();
    await scrapeOpenedCareer();
    await fetchJobsFromApi();
};
