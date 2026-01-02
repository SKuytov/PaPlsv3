# AI Maintenance Agent - Production Deployment Guide

## 🚀 Quick Deployment (3 Steps)

This guide assumes you have Ubuntu server access and git configured.

---

## STEP 1: Run Database Migration (5 min)

### In Supabase Dashboard:

1. Go to: **Supabase Project → SQL Editor**
2. Click **New Query**
3. Copy-paste the SQL from: `supabase/migrations/ai_agent_tables.sql`
4. Click **Run**

✅ **Expected Result:** Tables created with success message

**Tables Created:**
- `ai_diagnoses` - Stores all AI diagnoses
- `repair_history` - Links diagnoses to actual repairs
- `spare_parts_with_ai` - Spare parts catalog with AI metadata
- `ai_chat_sessions` - Conversation history (optional)

---

## STEP 2: SSH into Ubuntu Server

```bash
ssh user@your-server-ip
```

Then:

```bash
# Navigate to your project
cd /path/to/PaPlsv3

# Switch to feature branch
git fetch origin
git checkout feature/ai-maintenance-agent

# Pull latest changes
git pull origin feature/ai-maintenance-agent
```

---

## STEP 3: Configure Environment & Deploy

### 3.1 Copy .env.example to .env.local

```bash
cp .env.example .env.local
```

### 3.2 Edit .env.local with your API key

```bash
nano .env.local
```

**Required changes:**

```env
# Add your OpenAI API key
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4

# Keep existing variables unchanged
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 3.3 Install Dependencies (if first time)

```bash
npm install openai
```

### 3.4 Test the API

```bash
# Start server in test mode
npm run dev

# In another terminal, test AI endpoint
curl http://localhost:3000/api/ai/health

# Expected response:
# {"success":true,"status":"operational","apiKeyConfigured":true,"model":"gpt-4"}
```

### 3.5 Deploy to Production

```bash
# Stop dev server (Ctrl+C)

# Build production version
npm run build

# Start production server
npm run start

# Or use PM2 for process management (recommended)
pm2 start "npm run start" --name "paplsv3"
pm2 save
pm2 startup
```

---

## Verification Checklist

- [ ] Database tables created in Supabase
- [ ] `.env.local` has `OPENAI_API_KEY` set
- [ ] `npm install openai` completed
- [ ] Health check endpoint returns `operational`
- [ ] UI shows AI Assistant component (if integrated)
- [ ] No errors in `npm run build`
- [ ] Production server running with PM2

---

## Integration: Add to Your Dashboard

To use the AI Assistant in your app, add to your maintenance page:

```javascript
// pages/MaintenanceDashboard.jsx
import AIMaintenanceAssistant from '@/components/modules/AIMaintenanceAssistant';

export default function Dashboard() {
  const [selectedMachine, setSelectedMachine] = useState(null);

  return (
    <div className="grid grid-cols-3 gap-6 h-screen">
      {/* Left: Machine List */}
      <MachineList onSelect={setSelectedMachine} />

      {/* Right: AI Assistant */}
      {selectedMachine && (
        <AIMaintenanceAssistant
          machineId={selectedMachine.id}
          machineName={selectedMachine.name}
        />
      )}
    </div>
  );
}
```

---

## Environment Variables Explained

| Variable | Required | Example | Purpose |
|----------|----------|---------|----------|
| `OPENAI_API_KEY` | ✅ Yes | `sk-...` | OpenAI authentication |
| `OPENAI_MODEL` | ✅ Yes | `gpt-4` | Which model to use |
| `VITE_SUPABASE_URL` | ✅ Yes | `https://...` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | `eyJ...` | Supabase authentication |
| `NODE_ENV` | ⚠️ Optional | `production` | Server environment |

---

## API Endpoints (Now Available)

### Diagnosis
```
POST /api/ai/diagnose
Body: { machineId, symptoms, errorCodes?, context? }
Response: { success, diagnosis, machineInfo, diagnosisId }
```

### Chat Follow-up
```
POST /api/ai/chat
Body: { machineId, message, conversationHistory? }
Response: { success, response, tokensUsed }
```

### Feedback
```
POST /api/ai/feedback
Body: { diagnosisId, feedback, isAccurate, actualResolution? }
Response: { success, diagnosisStatus }
```

### Statistics
```
GET /api/ai/stats
Response: { stats: { totalDiagnoses, accuracyRate, ... } }
```

### Health Check
```
GET /api/ai/health
Response: { status: "operational", apiKeyConfigured: true }
```

---

## Cost Estimation

**OpenAI GPT-4 Pricing:**
- Input: $0.03 / 1K tokens
- Output: $0.06 / 1K tokens
- Average diagnosis: ~500 input + 500 output tokens
- Cost per diagnosis: ~$0.045

**Monthly Costs:**
| Daily Diagnoses | Monthly Cost |
|-----------------|-------------|
| 10 | ~$13 |
| 50 | ~$67 |
| 100 | ~$135 |
| 200 | ~$270 |

**Ways to Reduce Cost:**
- Use GPT-3.5-turbo instead (~50% cheaper)
- Implement caching for similar issues
- Use local LLM (Ollama) for $0/month

---

## Troubleshooting

### "OpenAI API key not configured"
```bash
# Check .env.local
grep OPENAI_API_KEY .env.local

# Should show:
# OPENAI_API_KEY=sk-...

# If empty, add it:
echo "OPENAI_API_KEY=sk-your-key" >> .env.local
```

### "Cannot connect to OpenAI"
```bash
# Check internet connection
ping api.openai.com

# Check if API key is valid
curl -H "Authorization: Bearer sk-your-key" https://api.openai.com/v1/models
```

### "Database tables not found"
```bash
# Make sure you ran the SQL migration in Supabase
# Go to Supabase → SQL Editor and run ai_agent_tables.sql
```

### "Port 3000 already in use"
```bash
# Kill existing process
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm run start
```

---

## Monitoring & Logs

### View Server Logs
```bash
# If using PM2
pm2 logs paplsv3

# If running directly
npm run start

# Look for lines starting with [AI]
# These show all AI operations
```

### Monitor API Usage
```bash
# Check usage statistics
curl http://localhost:3000/api/ai/stats
```

### Database Queries
```sql
-- Check total diagnoses
SELECT COUNT(*) as total FROM ai_diagnoses;

-- Check accuracy rate
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'verified_correct' THEN 1 END) as correct,
  ROUND(100.0 * COUNT(CASE WHEN status = 'verified_correct' THEN 1 END) / COUNT(*), 2) as accuracy_percent
FROM ai_diagnoses;

-- Check tokens used (for billing)
SELECT SUM(tokens_used) as total_tokens FROM ai_diagnoses;
```

---

## Switching to Local LLM (Ollama)

If you want to **save money** and use **local AI**:

### On Ubuntu Server:

```bash
# Download Ollama
curl https://ollama.ai/install.sh | sh

# Start Ollama with Mistral model
ollama pull mistral
ollama serve &

# Test it's running
curl http://localhost:11434/api/tags
```

### Update .env.local:

```env
# Comment out OpenAI
# OPENAI_API_KEY=sk-...

# Add Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

### Update server code:

Replace OpenAI calls with Ollama calls (code provided on request).

**Cost:** $0/month (just electricity) vs $135/month for GPT-4

---

## Next Steps

1. ✅ Deploy code
2. ✅ Configure API key
3. ⏭️ **Test with first diagnosis**
4. ⏭️ Integrate into dashboard
5. ⏭️ Train team on using AI assistant
6. ⏭️ Monitor accuracy and gather feedback
7. ⏭️ Optimize based on usage patterns

---

## Support

If you encounter issues:

1. Check `.env.local` has `OPENAI_API_KEY`
2. Verify database tables exist in Supabase
3. Check server logs: `npm run start`
4. Test health endpoint: `curl http://localhost:3000/api/ai/health`
5. Review this guide for troubleshooting section

---

**Deployment Time: ~10 minutes from start to production! 🚀**
