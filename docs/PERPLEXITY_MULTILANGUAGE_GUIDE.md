# 🌍 Perplexity AI + Multi-Language Support Guide

## Why Perplexity is Perfect for Your Use Case

### ✅ Web Search Capability
- **Finds manufacturer documentation** automatically from the internet
- **Searches technical forums** (Reddit, Stack Overflow, etc.)
- **Locates video tutorials** on YouTube
- **Accesses recent solutions** (not limited to training data cutoff)
- **Cites sources** so you can verify information

### ✅ Multi-Language Support
- Understands and responds in **Bulgarian** (български)
- Handles **English** manuals and documentation
- Translates **Italian** (Italiano) technical docs
- Understands **German** (Deutsch) specifications
- **Auto-detects** which language the technician is using

### ✅ Perfect for Your Scenario
```
Technician asks in Bulgarian:
"Мотор прави шум и вибрира. Температурата е 95°C."
          ↓
Perplexity:
1. Searches web for manufacturer docs (English/Italian/German)
2. Finds similar forum posts
3. Translates key information to Bulgarian
4. Provides diagnosis in Bulgarian
5. Cites sources (with links)
```

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Perplexity API Key

1. Go to: **https://www.perplexity.ai/settings/api**
2. Sign up or log in
3. Click **"Generate API Key"**
4. Copy the key (starts with `pplx-`)
5. Save it

**Cost:** Pay-as-you-go, similar to OpenAI (~$0.02-0.05 per request)

### Step 2: Configure Your Server

Edit `.env.local`:

```env
# Set provider to Perplexity
AI_PROVIDER=perplexity

# Add your Perplexity API key
PERPLEXITY_API_KEY=pplx-your-key-here

# Choose model (recommended for technical queries)
PERPLEXITY_MODEL=llama-3.1-sonar-large-128k-online
```

### Step 3: Restart Server

```bash
npm run start
```

That's it! ✅

---

## 🌍 Multi-Language Support

### How It Works

The AI **automatically detects** the language your technicians use:

#### Bulgarian Example
```javascript
// Technician types in Bulgarian:
"Хидравличната помпа изтича масло. Налягането пада от 200 до 150 бара."

// AI responds in Bulgarian:
"Най-вероятната причина е износване на уплътнението...
1. Проверете нивото на хидравличното масло
2. Инспектирайте помпата за видими течове
3. Заменете уплътнителния комплект (Part #HP-SEAL-001)

Източник: [Manufacturer Manual - Section 4.2]"
```

#### English Example
```javascript
// Technician types in English:
"Hydraulic pump leaking oil. Pressure drops from 200 to 150 bar."

// AI responds in English:
"Most likely cause is seal degradation...
1. Check hydraulic oil level
2. Inspect pump for visible leaks
3. Replace seal kit (Part #HP-SEAL-001)

Source: [Manufacturer Manual - Section 4.2]"
```

### Supported Languages

✅ **Bulgarian** (български)
- Full support for questions and answers
- Technical terms translated
- Manuals referenced in original language with Bulgarian summaries

✅ **English**
- Primary technical language
- Direct access to most documentation

✅ **Italian** (Italiano)
- Handles Italian machine manuals
- Translates to Bulgarian/English as needed

✅ **German** (Deutsch)
- Understands German specifications
- Translates technical documentation

### Mixed Language Handling

**Scenario:** Bulgarian question + English manual references

```
Question (Bulgarian): "Какъв е проблемът с код за грешка E502?"

AI Response (Bulgarian with English technical terms):
"Код за грешка E502 указва 'Servo Motor Overload'.

Причини:
1. Прекомерно натоварване на мотора
2. Износени лагери
3. Проблем с охлаждането

Препоръчани действия:
1. Проверете натоварването
2. Заменете лагерите (Part #SRV-BEARING-001)
3. Почистете вентилационните отвори

Источник: Siemens Manual EN-4502 (English), Page 47"
```

---

## 🔍 Web Search Benefits

### What Perplexity Can Find

1. **Manufacturer Documentation**
   - Official manuals (even if not uploaded)
   - Technical bulletins
   - Service notes
   - Parts catalogs

2. **Community Solutions**
   - Reddit discussions
   - Technical forums
   - Stack Overflow answers
   - Industry-specific sites

3. **Video Tutorials**
   - YouTube repair guides
   - Training videos
   - Step-by-step demonstrations

4. **Recent Updates**
   - Latest firmware updates
   - Recent recalls
   - Known issues (last 30 days)

### Example Search Results

```
Question: "CNC lathe spindle making grinding noise"

Perplexity finds and cites:
1. [Manufacturer Manual] - "Section 4.2: Spindle Bearing Maintenance"
2. [YouTube Video] - "How to Replace CNC Spindle Bearings" (12:34)
3. [Reddit r/machinists] - "I had same issue, replaced bearing after 8000 hours"
4. [Technical Forum] - "Common failure mode, check part #LTH-BRG-002"

AI synthesizes all sources into one answer with citations.
```

---

## 📋 Configuration Options

### Available Models

| Model | Best For | Speed | Cost | Web Search |
|-------|----------|-------|------|------------|
| `llama-3.1-sonar-small-128k-online` | Quick queries | ⚡ Fast | $ | ✅ Yes |
| `llama-3.1-sonar-large-128k-online` | **Technical queries** | ⚡⚡ Medium | $$ | ✅ Yes |
| `llama-3.1-sonar-huge-128k-online` | Complex diagnostics | ⚡⚡⚡ Slower | $$$ | ✅ Yes |

**Recommended:** `llama-3.1-sonar-large-128k-online` (best balance)

### Search Filters (Optional)

```env
# In your code, you can configure:

# Prefer recent content
search_recency_filter: 'month'  # or 'week', 'day'

# Focus on specific domains
search_domain_filter: ['youtube.com', 'reddit.com', 'manufacturer-site.com']

# Return citations
return_citations: true
```

---

## 💰 Cost Comparison

### Perplexity Pricing

| Usage | Monthly Cost | Per Request |
|-------|--------------|-------------|
| 10 requests/day | ~$15 | ~$0.05 |
| 50 requests/day | ~$75 | ~$0.05 |
| 100 requests/day | ~$150 | ~$0.05 |

**Similar to OpenAI GPT-4 pricing**

### ROI for Your Business

**Benefits of Perplexity over OpenAI:**
- ✅ Web search = finds solutions not in training data
- ✅ Citations = technicians can verify info
- ✅ Recent updates = not limited by data cutoff
- ✅ Multi-language = works naturally in Bulgarian

**One prevented downtime incident:** Saves $1,000-5,000
**Monthly AI cost:** ~$150
**Net benefit:** Massive ROI

---

## 🛠️ Technical Implementation

### Environment Variables

```env
# .env.local
AI_PROVIDER=perplexity
PERPLEXITY_API_KEY=pplx-xxxxx
PERPLEXITY_MODEL=llama-3.1-sonar-large-128k-online
```

### How It Works

1. **Request received** in Bulgarian
2. **Perplexity searches** web for relevant info (English/Italian/German docs)
3. **AI synthesizes** information from multiple sources
4. **AI translates** and formats response in Bulgarian
5. **Citations included** so technician can verify
6. **Response returned** in seconds

### Code Example

```javascript
// Already implemented in server/routes/aiAssistant.js

const response = await aiClient.chat.completions.create({
  model: 'llama-3.1-sonar-large-128k-online',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT }, // Multi-language support
    { role: 'user', content: bulgarianQuestion }
  ],
  return_citations: true,  // Include web sources
  search_recency_filter: 'month'  // Prefer recent content
});

// Response includes:
// - diagnosis (in Bulgarian)
// - citations (with URLs)
// - tokensUsed
```

---

## 🧪 Testing

### Test Bulgarian Questions

```bash
curl -X POST http://localhost:3000/api/ai/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "machineId": "machine-uuid",
    "symptoms": "Мотор прави шум и температурата е висока",
    "language": "bulgarian"
  }'
```

### Test English Questions

```bash
curl -X POST http://localhost:3000/api/ai/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "machineId": "machine-uuid",
    "symptoms": "Motor making noise and temperature is high",
    "language": "english"
  }'
```

### Expected Response

```json
{
  "success": true,
  "diagnosis": "Най-вероятната причина е износване на лагерите...",
  "citations": [
    {
      "url": "https://manufacturer.com/manual-section-4-2",
      "title": "Bearing Maintenance Guide"
    },
    {
      "url": "https://youtube.com/watch?v=xyz",
      "title": "How to Replace Motor Bearings"
    }
  ],
  "provider": "perplexity",
  "model": "llama-3.1-sonar-large-128k-online"
}
```

---

## ✅ Deployment Checklist

- [ ] Get Perplexity API key from https://www.perplexity.ai/settings/api
- [ ] Edit `.env.local`:
  - [ ] Set `AI_PROVIDER=perplexity`
  - [ ] Add `PERPLEXITY_API_KEY=pplx-your-key`
  - [ ] Set `PERPLEXITY_MODEL=llama-3.1-sonar-large-128k-online`
- [ ] Restart server: `npm run start`
- [ ] Test health: `curl http://localhost:3000/api/ai/health`
- [ ] Test Bulgarian question
- [ ] Verify citations are returned
- [ ] Done! ✅

---

## 🌟 Key Advantages for Your Business

### 1. Multi-Language by Default
- ✅ Technicians ask questions in Bulgarian
- ✅ AI finds English/Italian/German manuals
- ✅ AI translates and responds in Bulgarian
- ✅ No manual translation needed

### 2. Web Search Capability
- ✅ Finds manufacturer docs online
- ✅ Searches technical forums
- ✅ Locates video tutorials
- ✅ Accesses recent solutions

### 3. Citations Included
- ✅ Every answer includes sources
- ✅ Technicians can verify info
- ✅ Links to original documentation

### 4. Up-to-Date Information
- ✅ Not limited by training data cutoff
- ✅ Finds recent forum posts
- ✅ Accesses latest manufacturer updates

---
## 📞 Support

**Perplexity not working?**
1. Check API key is correct
2. Verify `.env.local` has `AI_PROVIDER=perplexity`
3. Test: `curl http://localhost:3000/api/ai/health`
4. Check logs: Look for `[AI] Provider: perplexity`

**Multi-language issues?**
1. Language auto-detection is built-in
2. AI matches response language to question language
3. No configuration needed
4. Test with Bulgarian question to verify

---

## 🎯 Summary

**You now have:**
- ✅ Perplexity AI integration (web search)
- ✅ Multi-language support (Bulgarian, English, Italian, German)
- ✅ Automatic language detection
- ✅ Citation of sources
- ✅ Access to online documentation

**Your task:**
1. Get Perplexity API key
2. Set `AI_PROVIDER=perplexity` in `.env.local`
3. Add API key
4. Restart server
5. Done!

**Your technicians can now ask questions in Bulgarian and get answers that reference English/Italian/German manuals automatically!** 🚀
