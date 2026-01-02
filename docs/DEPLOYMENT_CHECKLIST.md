# ✅ AI Maintenance Agent - Deployment Checklist

## Your Role: Copy, Paste, Deploy

**Estimated Time:** 15 minutes  
**Difficulty:** Easy (just follow steps)  
**What You'll Have:** Production-ready AI system

---

# STEP 1: Database Setup (5 min)

## Action: Run SQL in Supabase

- [ ] Open: https://supabase.com
- [ ] Go to your project
- [ ] Click: **SQL Editor**
- [ ] Click: **New Query**
- [ ] Open file: `supabase/migrations/ai_agent_tables.sql`
- [ ] **Copy** entire content
- [ ] **Paste** into Supabase query editor
- [ ] Click: **Run**
- [ ] See success message: ✅ "Database tables created"
- [ ] Close the query

## Expected Result:

```
Tables created:
✅ ai_diagnoses
✅ repair_history  
✅ spare_parts_with_ai
✅ ai_chat_sessions
✅ Views created
✅ Functions created
```

---

# STEP 2: Get OpenAI API Key (3 min)

## Action: Create OpenAI Account

- [ ] Go to: https://platform.openai.com/api-keys
- [ ] Sign up or log in
- [ ] Click: **Create new secret key**
- [ ] Copy the key (it starts with `sk-`)
- [ ] **Save it somewhere safe** - You'll need it in 2 minutes
- [ ] **Don't share this key!**

## Expected:

```
Key looks like: sk-proj-xxxxxxxxxxxxxxxxxxx
```

---

# STEP 3: Deploy Code (7 min)

## Action: SSH into Ubuntu Server

```bash
# Open terminal and run:
ssh user@your-server-ip

# Enter password when prompted
```

## Navigate to Project

```bash
# Go to project folder
cd /path/to/PaPlsv3

# Example:
cd ~/projects/PaPlsv3
```

## Get Latest Code

```bash
# Fetch from GitHub
git fetch origin

# Switch to AI branch
git checkout feature/ai-maintenance-agent

# Get latest updates
git pull origin feature/ai-maintenance-agent
```

## Install AI Package

```bash
# Install OpenAI library
npm install openai
```

- [ ] Wait for "npm notice" completion

## Create Environment File

```bash
# Copy template
cp .env.example .env.local

# Open editor
nano .env.local
```

## Add Your OpenAI Key

Find this line:
```env
OPENAI_API_KEY=sk-your-api-key-here
```

Replace with YOUR key:
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxx
```

**Save and Exit:**
- Press: `Ctrl+X`
- Type: `Y`
- Press: `Enter`

## Test Configuration

```bash
# Verify API key is set
grep OPENAI_API_KEY .env.local

# Should show your key
```

## Build and Deploy

```bash
# Build production version
npm run build

# Wait for "build complete" message
```

## Start Production Server

```bash
# Option A: Simple start
npm run start

# Option B: With PM2 (recommended, runs in background)
pm2 start "npm run start" --name "paplsv3"
pm2 save
pm2 startup
```

## Verify It Works

In another terminal:
```bash
# Test the health endpoint
curl http://localhost:3000/api/ai/health

# Should return:
# {"success":true,"status":"operational","apiKeyConfigured":true}
```

- [ ] Health check returns `operational`
- [ ] No error messages

---

# STEP 4: Verification (Checklist)

- [ ] Database migration ran successfully
- [ ] Tables exist in Supabase
- [ ] `.env.local` has your OpenAI key
- [ ] `npm install openai` completed
- [ ] `npm run build` succeeded
- [ ] Server running without errors
- [ ] Health endpoint returns `operational`
- [ ] No `OPENAI_API_KEY` errors in logs

---

# STEP 5: Integration (Optional)

## Add to Your Dashboard

In your React component file:

```javascript
import AIMaintenanceAssistant from '@/components/modules/AIMaintenanceAssistant';

export default function MaintenancePage() {
  return (
    <AIMaintenanceAssistant
      machineId="your-machine-uuid"
      machineName="Machine Name Here"
    />
  );
}
```

That's it! The AI assistant now appears in your UI.

---

# TROUBLESHOOTING

## Problem: "Cannot find module 'openai'"

**Solution:**
```bash
npm install openai
```

## Problem: "OPENAI_API_KEY not configured"

**Solution:**
1. Check: `cat .env.local | grep OPENAI`
2. Should show your key
3. If missing, edit: `nano .env.local`
4. Add: `OPENAI_API_KEY=sk-your-key`
5. Restart server: `npm run start`

## Problem: "Port 3000 already in use"

**Solution:**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Try again
npm run start
```

## Problem: Database tables not found

**Solution:**
1. Open Supabase
2. Go to SQL Editor
3. Run the migration file again
4. Verify all tables appear in left sidebar

## Problem: Getting rate limited by OpenAI

**Solution:**
- Your account may be limited
- Check: https://platform.openai.com/account/billing/usage
- Add payment method if needed
- Or use fewer diagnoses per day

---

# FINAL CHECKLIST

## You've Successfully Deployed When:

- [ ] ✅ Database tables created in Supabase
- [ ] ✅ `.env.local` has `OPENAI_API_KEY` set
- [ ] ✅ Server running without errors
- [ ] ✅ Health endpoint returns: `{"status": "operational"}`
- [ ] ✅ Can access UI in browser
- [ ] ✅ First diagnosis works

---

# WHAT'S NEXT?

1. **Test it!**
   - Go to maintenance page
   - Select a machine
   - Click "AI Assistant"
   - Describe a machine problem
   - Get diagnosis

2. **Show your team**
   - Brief training (2 mins)
   - Let them try it
   - Gather feedback

3. **Monitor & optimize**
   - Check logs: `npm run start`
   - Track usage: `curl http://localhost:3000/api/ai/stats`
   - Adjust costs if needed

---

# SUPPORT DOCS

- 📖 Full guide: `docs/DEPLOYMENT_GUIDE.md`
- 🚀 Quick start: `docs/AI_AGENT_QUICKSTART.md`
- 📚 Deep dive: `docs/AI_MAINTENANCE_AGENT.md`
- 📋 This checklist: You're reading it!

---

# TIME BREAKDOWN

| Task | Time | Status |
|------|------|--------|
| Database setup | 5 min | ⏱️ |
| Get API key | 3 min | ⏱️ |
| SSH & deploy | 7 min | ⏱️ |
| **TOTAL** | **15 min** | ⏱️ |

---

## 🎉 That's It!

You now have a production-ready AI maintenance system.

Your team can start diagnosing problems immediately.

**Questions?** Read the support docs or check logs with `npm run start`.

**Ready?** Start with STEP 1! 🚀
