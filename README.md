# Job Portal Application

A full-stack job portal built with React, Vite, Node.js, Express, and MongoDB. This platform allows applicants to apply for jobs and companies to post available positions.

## Project Structure

- **Frontend**: Built with React, Vite, Tailwind CSS, and standard UI components (shadcn).
- **Backend**: Node.js API with Express.js, MongoDB + Mongoose, and Cloudinary for document/logo uploads.

## Setup Instructions

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB running locally or remotely (e.g. MongoDB Atlas)
- Cloudinary account for file/resume handling

### Backend
1. `cd Backend`
2. `npm install`
3. Create a `.env` file in the Backend directory using `.env.example` as a template. Include your DB, Cloudinary, and signing keys.
4. Run `npm run dev` to start the Node server.

### Frontend
1. `cd Frontend`
2. `npm install`
3. Run `npm run dev` to start the Vite application.

## Security & Maintenance
- Re-configured Git tracking to ensure sensitive environment configuration is excluded.
- Implemented robust `httpOnly` authentication cookies to deter XSS script-stealing.
- Handled global edge-cases during image uploads to maintain 100% server uptime even on malformed requests.
