# OECMS CBT Portal — Backend Setup Guide

This turns the portal into a real website: any device (phone, laptop, lab
computer) that opens your link sees the exact same students, subjects,
questions, and results. No Claude.ai account needed to use it.

You do NOT need to know how to code. Just follow the steps below in order.
Budget about 20–30 minutes the first time.

---

## What you'll create (all free tiers, no credit card required for the parts below)

1. A free **MongoDB Atlas** database — this is where all school data lives.
2. A free **Anthropic API key** — this lets teachers generate questions from
   a scheme of work automatically. (Optional — skip this and manual question
   entry still works fine.)
3. A free **Render.com** web service — this is what actually runs the site
   and gives you a public link like `https://oecms-portal.onrender.com`.

---

## Step 1 — Create your database (MongoDB Atlas)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. When asked to create a cluster, choose the **free "M0" tier** (it's really free).
3. Create a database user: pick a username and password (write these down —
   you'll need them in Step 3). Under "Network Access", click **Allow access
   from anywhere** (0.0.0.0/0) so Render can connect.
4. Once the cluster is ready, click **Connect → Drivers**, choose Node.js,
   and copy the connection string. It looks like:
   `mongodb+srv://yourusername:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Replace `<password>` with the real password you set, and add a database
   name before the `?`, e.g. `.../oecms?retryWrites=true...`. Save this
   full string somewhere — this is your `MONGODB_URI`.

## Step 2 — Get an Anthropic API key (optional, for AI question generation)

1. Go to https://console.anthropic.com and create an account.
2. Go to **API Keys** and create a new key. Copy it (starts with `sk-ant-...`).
   Save it — this is your `ANTHROPIC_API_KEY`.
3. Anthropic API usage is billed per use (add a small amount of credit on
   the Billing page). If you skip this step, the portal still works —
   teachers just enter questions manually instead of using the "Generate
   from Scheme (AI)" button.

## Step 3 — Put this code on GitHub

1. Create a free account at https://github.com if you don't have one.
2. Create a new **repository** (e.g. named `oecms-portal`). Keep it Private
   if you prefer.
3. Upload all the files in this folder (`server.js`, `package.json`, the
   `public` folder, etc.) to that repository — GitHub's website lets you
   drag and drop files in ("Add file → Upload files").
   Do **not** upload your `.env` file if you create one locally — only
   `.env.example` should go up.

## Step 4 — Deploy on Render

1. Go to https://render.com and sign up (you can sign up with your GitHub account).
2. Click **New → Web Service**, and connect the GitHub repository you made in Step 3.
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Under **Environment Variables**, add:
   - `MONGODB_URI` → paste the connection string from Step 1
   - `ANTHROPIC_API_KEY` → paste the key from Step 2 (skip if you didn't do Step 2)
5. Click **Create Web Service**. Wait a couple of minutes for it to build and deploy.
6. Render will give you a live link, e.g. `https://oecms-portal.onrender.com`
   — this is the link you share with students, teachers, and management.

> Note: on Render's free tier, the site "sleeps" after 15 minutes of no
> traffic and takes ~30 seconds to wake up on the next visit. This is fine
> for a school portal but worth knowing — the first visitor after a break
> will see a short delay. Paid tiers remove this.

---

## Using it day to day

- **Management password** default: `oecms-mgt-2026` — change it immediately
  under Management → Settings.
- **Teacher password** default: `oecms-teacher-2026` — change it under
  Management → Teacher Access.
- Everything else (subjects, students, questions, scores, results) works
  exactly as before — it now just saves to your shared database instead of
  one browser.

## If something goes wrong

- Visit `https://your-link.onrender.com/healthz` — it should show
  `{"ok":true,"dbConnected":true}`. If `dbConnected` is `false`, double
  check your `MONGODB_URI` environment variable on Render and that Network
  Access in Atlas is set to allow all IPs.
- If "Generate from Scheme (AI)" fails, double check `ANTHROPIC_API_KEY` is
  set on Render and that your Anthropic account has billing credit.

Happy to help troubleshoot any of these steps — just tell me what error or
screen you're stuck on.
