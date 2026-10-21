# Punch List Dashboard

Reads `CONSOLIDATED_PUNCHLIST.xlsx` (sheet SUMMARY) and shows status, owners, due dates and a filterable list of all punch list actions.

## Excel rules
- Keep the headings in row 1 (PL-NO., LOCATION, SMS RECOMMENDATION, REQUIRED ACTION, RESPONSIBLE PARTY, REMARKS, START DATE, FINISH DATE...). Column order does not matter.
- REMARKS holds the status (IN PROGRESS, COMPLETED, ON-HOLD, NOT STARTED, TO BE SCHEDULED, FOR APPROVAL, ...).
- A "-" or blank date is treated as no date.

## Run locally
1. `npm install`
2. Put `CONSOLIDATED_PUNCHLIST.xlsx` in this folder (save and close it).
3. `npm run generate-data`, then `npm start`, open http://localhost:3000

## Publish (once)
1. `git init`, create an empty GitHub repo, `git add .`, `git commit -m "First version"`, `git remote add origin <repo url>`, `git push -u origin main`.
2. Render > New > Web Service > pick the repo. Build `npm install`, Start `npm start`, Health Check Path `/health`, Free instance.
3. The Excel file is not uploaded (see `.gitignore`); only the two JSON files are.

## Every update
Edit the Excel, save and close it, double-click `update-dashboard.bat`.
