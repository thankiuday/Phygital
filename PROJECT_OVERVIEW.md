## Phygital Overview

Phygital is a platform that bridges the gap between physical marketing materials and rich digital experiences. Businesses and creators upload their print-ready designs and supporting media, and the system generates personalized landing pages that can be reached through unique QR codes. All interactions are tracked so teams can measure engagement and iterate without reprinting collateral.

## Problem Statement

Physical assets—posters, brochures, packaging—are hard to update and nearly impossible to measure once they are in the wild. Traditional static QR codes only point to a fixed URL, so refreshing the experience usually means reprinting everything. Teams also lack a unified place to manage content, track scans, watch-through rates, and link clicks tied to each piece of collateral.

## Solution

Phygital introduces dynamic QR codes backed by a content management and analytics system:

- A protected dashboard lets users upload design images, host explainer videos, and configure social links.
- Each project automatically receives a unique, customizable landing page URL.
- The QR code can be printed once and remain valid even as the underlying digital content evolves.
- Every scan, video view, and link click is captured and surfaced in analytics dashboards for real-time insight.

## Core Features

- **Dynamic QR Delivery**: Personalized URLs stay constant while content updates instantly.
- **Rich Media Hosting**: Images and videos stored in AWS S3 with metadata and validation.
- **AR Experience Page**: React-based landing page optimized for mobile scanning contexts.
- **Engagement Analytics**: Tracks scans, video views, and link clicks with device/session context.
- **Account Management**: JWT-secured authentication, profile management, and project organization.
- **Social Integrations**: Optional links to social platforms and websites directly from the landing page.

## Architecture at a Glance

- **Frontend**: React (Vite, React Router, React Query, Tailwind CSS) delivers dashboards and public AR/landing experiences.
- **Backend**: Node.js + Express exposes REST APIs, handles authentication, generates QR codes, and orchestrates analytics intake.
- **Database**: MongoDB + Mongoose persist users, projects, uploaded media metadata, QR configurations, and analytics events.
- **Storage & Infrastructure**: AWS S3 stores media assets; deployment targets include Render/Vercel and scripts for VPS automation.

## Data Flow

1. **Creator Onboarding**: Users register and authenticate via JWT-secured routes.
2. **Content Upload**: Design artwork and explainer videos are uploaded to S3 through backend endpoints. QR hotspots and social links are saved with the project.
3. **QR Generation**: The backend returns a unique QR image encoding the project URL. Once printed, the QR URL remains constant.
4. **Visitor Experience**: Scanning the QR loads the AR experience page, which fetches project content and renders interactive media.
5. **Analytics Capture**: Client events (scan, video view, link click) call analytics endpoints. The backend persists the events for reporting.
6. **Dashboard Insight**: Authenticated users view aggregated metrics—totals, timelines, and engagement breakdowns—in the analytics dashboard.

## Why It Matters

- **No Reprints Needed**: Update campaigns instantly without changing physical materials.
- **Holistic Insights**: Understand engagement from scan to conversion across every QR deployment.
- **Consistent Branding**: Centralized management keeps messaging and visuals synchronized.
- **Scalable Foundation**: Modern web stack enables rapid iteration, deployment flexibility, and integration extensibility.

## Next Steps

- Explore `frontend/src/pages/ARExperience/ARExperiencePage.jsx` for the visitor-side experience.
- Review `backend/routes` for API endpoints covering upload, QR, and analytics flows.
- Consult the various `*_SUMMARY.md` files for historical fixes and deployment practices.




