#!/usr/bin/env bash
# Build prospects/wichita-cleaning/ledger.md from the two qualifier reports.
set -euo pipefail
S=/tmp/claude-0/-home-user/6e2e71a9-647d-5049-a9df-d1030ca2580b/scratchpad
D=/home/user/ff-content-demo-factory/prospects/wichita-cleaning
mkdir -p "$D"
{
  echo "# Wichita cleaning: prospect ledger"
  echo
  echo "Architect run, 2026-11-09. Two scout searches (50 results each, worked bottom-up): \"commercial cleaning Wichita KS\" and \"house cleaning Wichita KS\". Scout data: scout-data branch, scout/commercial-cleaning-wichita-ks and scout/house-cleaning-wichita-ks."
  echo
  echo "## Picks"
  echo
  echo "| Business | Side | Folder | Why |"
  echo "|---|---|---|---|"
  echo "| Ramco Building Maintenance | Commercial | ramco-building-maintenance | Local family-owned janitorial company, 25 reviews; site has lorem ipsum, a \"John Doe\" sample testimonial and dev labels showing |"
  echo "| Harris Facility Solutions | Commercial | harris-facility-solutions | Owner-run office/janitorial company since 2015, 22 reviews; template one-pager, menu links to #, conflicting response times |"
  echo "| Mida's Maid Service | Residential | midas-maid-service | Owner Mida, 18+ years, clients of 8 to 16 years; 4-page Squarespace site with no headline saying house cleaning or Wichita |"
  echo "| Jenny Maid's | Residential | jenny-maids | Small house cleaner, 41 reviews; template WordPress site, Services and Locations menus link to #, no owner, no address |"
  echo
  echo "Reserves: Air Capital Cleaning Co. (commercial + homes, 31 reviews), Clean Maid USA (mostly residential, 67 reviews), Shine Bright Cleaning (mixed, 115 reviews)."
  echo
  echo "## Commercial cleaning search"
  echo
  sed -n '/^## 1/,$p' "$S/qualify-commercial.md" | sed 's/^## /### /'
  echo
  echo "## House cleaning search"
  echo
  sed -n '/^## 1/,$p' "$S/qualify-house.md" | sed 's/^## /### /'
} > "$D/ledger.md"
echo "wrote $D/ledger.md"
