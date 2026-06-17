# FestWish — Exact Deploy Steps
## Termux → GitHub → Render

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## WHY YOUR SITE SHOWED 404
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ WRONG — Opening index.html in SPCK "Preview"
   → No server running → all /api calls return 404

❌ WRONG — Opening github.com/yourname/festwish
   → GitHub only shows code, does NOT run Node.js

✅ RIGHT — After Render deploy, open:
   https://your-app-name.onrender.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 1 — TERMUX SETUP (one time)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Open Termux and run:

  pkg update && pkg upgrade -y
  pkg install nodejs git -y
  node --version        # must show v18 or higher
  npm --version

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 2 — PUT PROJECT ON GITHUB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to github.com on your phone
2. Tap + → New repository
3. Name: festwish
4. Set to Public
5. DO NOT add README or .gitignore (we have them)
6. Tap Create repository
7. Copy the repo URL shown (https://github.com/YOU/festwish.git)

In Termux:

  cd ~
  # Extract the zip you downloaded (festwish-final.zip)
  # Termux usually saves downloads to /sdcard/Download/
  cp /sdcard/Download/festwish-final.zip ~/
  cd ~
  unzip festwish-final.zip
  cd festwish

  git init
  git add .
  git commit -m "initial"
  git branch -M main
  git remote add origin https://github.com/YOU/festwish.git
  git push -u origin main

  # It will ask GitHub username + password
  # For password use a Personal Access Token from:
  # github.com → Settings → Developer settings → Personal access tokens → Generate new token
  # Scopes needed: repo (tick the checkbox)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 3 — MONGODB ATLAS (free)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to mongodb.com → Sign up free
2. Create a free M0 cluster (any region)
3. Security → Database Access → Add database user
      Username: festwishuser
      Password: choose a strong password (write it down)
      Role: Read and write to any database
4. Security → Network Access → Add IP Address
      Choose "Allow Access From Anywhere" (0.0.0.0/0)
      (This lets Render connect)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 4 — CLOUDINARY (free)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to cloudinary.com → Sign up free
2. Go to Dashboard
3. Copy these 3 values:
      Cloud name
      API Key
      API Secret
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 5 — DEPLOY ON RENDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to render.com → Sign up with GitHub
2. Tap New + → Web Service
3. Connect your festwish GitHub repository
4. Fill in:
      Name:          festwish
      Region:        pick closest to India (Singapore)
      Branch:        main
      Runtime:       Node
      Build Command: npm install
      Start Command: npm start
      Plan:          Free

5. Tap "Advanced" → "Add Environment Variable"
   Add ALL of these one by one:

   Key                      Value
   ─────────────────────────────────────────────
   NODE_ENV                 production
   BASE_URL                 (leave blank for now)
   MONGODB_URI              (your Atlas URI from Step 3)
   CLOUDINARY_CLOUD_NAME    (from Step 4)
   CLOUDINARY_API_KEY       (from Step 4)
   CLOUDINARY_API_SECRET    (from Step 4)

6. Tap "Create Web Service"
7. Wait 3-5 minutes for first deploy
8. You'll see a URL like: https://festwish-abc1.onrender.com
9. Go back to Environment → edit BASE_URL → paste that URL
10. Tap "Manual Deploy" → Deploy latest commit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 6 — TEST YOUR LIVE SITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Open: https://festwish-abc1.onrender.com

✅ Songs should load in Step 4
✅ Upload photo → Generate → should show share link
✅ Share link on WhatsApp → receiver sees cinematic wish

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STEP 7 — MAKING CHANGES LATER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Edit files in SPCK Editor, then in Termux:

  cd ~/festwish
  git add .
  git commit -m "my changes"
  git push

Render auto-redeploys on every push. Wait 2-3 min then refresh your Render URL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Songs not loading:
  → Check Render logs (Dashboard → Logs tab)
  → Make sure your MP3s are in public/audio/ and pushed to GitHub

Upload fails:
  → Check CLOUDINARY_* env vars are correct in Render
  → Check Render logs for "Cloudinary credentials missing"

MongoDB error in logs:
  → Check MONGODB_URI is correct
  → Check Atlas Network Access allows 0.0.0.0/0

Render deploy fails:
  → Check Build logs in Render dashboard
  → Most common: package not found → npm install issue

Site loads but API 404:
  → You're not on the Render URL
  → Must be https://your-app.onrender.com NOT github.com/...
