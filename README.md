# RoopLab: how to put the website online

RoopLab is one page (`index.html`) plus a small server file (`api/claude.js`) that talks to the AI.
Without the server file the site still works in **guided mode** (built-in questions, materials, rules and the five case studies).

## Option 1: free test link in 5 minutes (guided mode, no AI)
1. Go to https://app.netlify.com/drop and create a free account.
2. Drag the whole `rooplab` folder onto the page.
3. Netlify gives you a link like `https://something.netlify.app`. Rename it under Site settings → Change site name (e.g. `rooplab-thesis`).
4. Send that link to your testers. They need no account. The interview, analysis, report and feedback form all work.

## Option 2: full AI version on Vercel (about $5 in total)
### A. Put the files on GitHub (free)
1. Create an account at https://github.com.
2. New repository → name it `rooplab` → Create.
3. "uploading an existing file" → drag `index.html`, `vercel.json` and the `api` folder → Commit.

### B. Connect Vercel (free)
1. Create an account at https://vercel.com with "Continue with GitHub".
2. Add New → Project → import `rooplab` → Deploy.
3. Your site is live at `https://rooplab.vercel.app` (or similar). It runs in guided mode until step C.

### C. Add the AI key (about $5)
1. Go to https://console.anthropic.com, create an account, open Billing and buy $5 of credits.
2. Set a monthly spend limit (Billing → Limits), for example $10.
3. Settings → API Keys → Create Key → copy it (it is shown only once).
4. In Vercel: Project → Settings → Environment Variables → add `ANTHROPIC_API_KEY` = your key.
5. Recommended: add `ACCESS_CODE` = a secret word like `THESIS2026`. The whole website is then locked: only people who open `https://rooplab.vercel.app/?code=THESIS2026` (or type the code on the lock screen) can use it. Everyone else sees "This website is by invitation" and cannot use your AI credit.
6. Deployments → Redeploy. The badge in the Tool now says **AI assistant live**.

## Changing the website later
Send the new `index.html` to GitHub (open the file → pencil icon, or upload again). Vercel updates the live site in about a minute. The key and settings stay.

## Cost guide
About $0.10 to $0.20 per full session (22 questions + analysis). 20 sessions ≈ $2 to $4. Credits expire after one year.
