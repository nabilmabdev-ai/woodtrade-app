
# Woodtrade App

[![RBAC Integrity](https://github.com/nabilmabdev-ai/woodtrade-app/actions/workflows/rbac-audit.yml/badge.svg)](https://github.com/nabilmabdev-ai/woodtrade-app/actions/workflows/rbac-audit.yml)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## RBAC Integrity Pipeline

This project includes a CI/CD pipeline to enforce Role-Based Access Control (RBAC) integrity. The pipeline runs on every pull request and push to the `main` branch, and it will fail if any mismatches are detected between the frontend and backend RBAC rules.

The pipeline is defined in the [`.github/workflows/rbac-audit.yml`](.github/workflows/rbac-audit.yml) file. It performs the following steps:

1.  **Installs dependencies and builds the project.**
2.  **Runs the RBAC audit script.** This script scans all API routes and compares the `ALLOWED_ROLES` with the frontend permissions defined in `src/lib/permissions.ts`.
3.  **Verifies the audit report.** A second script checks the generated report for any mismatches. If any are found, the build fails.
4.  **Uploads the audit report as an artifact.** If the build fails, the `rbac_audit/report.json` and `rbac_audit/summary.md` files are uploaded as artifacts for inspection.

This pipeline ensures that all changes to the codebase are compliant with the defined RBAC rules, preventing accidental or unauthorized changes to user permissions.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
