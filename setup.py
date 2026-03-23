# ===============================
# AppPreflight MVP scaffold
# ===============================

# App Router pages
mkdir \app
mkdir \app\api
mkdir \app\api\scan
mkdir \app\privacy
mkdir \app\terms
mkdir \app\scan

# Lib folders
mkdir lib
mkdir lib\github
mkdir lib\scanners

# Public (future logos etc.)
mkdir public

# -------------------------------
# Create placeholder files
# -------------------------------

# Root app files
New-Item \app\page.tsx -ItemType File -Force
New-Item \app\layout.tsx -ItemType File -Force

# Scan pages
New-Item \app\scan\page.tsx -ItemType File -Force

# Legal pages
New-Item \app\privacy\page.tsx -ItemType File -Force
New-Item \app\terms\page.tsx -ItemType File -Force

# API route
New-Item \app\api\scan\route.ts -ItemType File -Force

# Lib files
New-Item \lib\github.ts -ItemType File -Force
New-Item \lib\scanners\ios.ts -ItemType File -Force
New-Item \lib\scanners\android.ts -ItemType File -Force
New-Item \lib\scanners\repoWide.ts -ItemType File -Force

Write-Host "✅ AppPreflight MVP structure created"
