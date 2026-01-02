# AI Maintenance Agent System

## 🤖 Overview

An intelligent AI agent system designed to:
- **Diagnose machine problems** from symptom descriptions
- **Recommend spare parts** needed for repairs
- **Provide step-by-step troubleshooting guides**
- **Prevent downtime** by enabling technicians to resolve issues faster
- **Optimize inventory** by predicting spare parts needs
- **Learn from historical data** to improve recommendations over time

---

## 🎯 Key Benefits

✅ **Reduced Downtime**
- Instant diagnostic assistance available 24/7
- No waiting for senior technicians
- Self-service troubleshooting reduces response time

✅ **Optimized Spare Parts Inventory**
- AI predicts parts needed based on machine type and symptoms
- Reduces emergency orders and expedited shipping
- Identifies slow-moving parts

✅ **Knowledge Preservation**
- Captures expert knowledge from manuals and experience
- Makes knowledge accessible to all technicians (junior and senior)
- Consistent troubleshooting methodology

✅ **Cost Savings**
- Fewer emergency calls
- Less equipment idle time
- Optimized parts ordering
- Reduced technician travel time

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Technician Interface                      │
│  (React Component: MaintenanceAIAssistant)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐      ┌──────────────────┐             │
│  │ Problem Input    │      │ Chat History     │             │
│  │ - Symptoms       │      │ - Suggestions    │             │
│  │ - Machine Info   │      │ - Diagnostics    │             │
│  │ - Error Codes    │      │ - Parts List     │             │
│  └──────────────────┘      └──────────────────┘             │
│                                                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              API Layer (Node.js Backend)                     │
│  POST /api/ai/diagnose                                       │
│  POST /api/ai/chat                                           │
│  POST /api/ai/get-spareparts                                 │
│  GET /api/ai/manual/:machineId                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          AI/LLM Processing Layer                             │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ OpenAI GPT-4 / Claude / Local LLM                      │ │
│  │ - Analyzes symptoms                                     │ │
│  │ - Recommends troubleshooting steps                      │ │
│  │ - Identifies required spare parts                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ RAG (Retrieval Augmented Generation)                   │ │
│  │ - Retrieves relevant manual sections                   │ │
│  │ - Loads spare parts catalog                            │ │
│  │ - Pulls historical repair records                      │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ PDF Vector  │ │  Supabase    │ │  Spare Parts │
│ Database    │ │  (Repair     │ │  Catalog DB  │
│ (Manuals &  │ │   History &  │ │              │
│  Catalogs)  │ │   Inventory) │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## 📦 Implementation Steps

### Phase 1: Data Preparation (Week 1-2)

#### 1.1 Create Vector Database for Manuals

**What:** Convert PDF manuals into searchable embeddings

**Tools:**
- `pdf2image` - Convert PDFs to images
- `pytesseract/pdfplumber` - Extract text from PDFs
- `OpenAI Embeddings API` or `Hugging Face` - Create embeddings
- `Supabase pgvector` or `Pinecone` - Store vectors

**Process:**
```javascript
// Pseudo-code for manual ingestion
const ingestManual = async (pdfPath) => {
  // 1. Extract text from PDF
  const text = await extractPdfText(pdfPath);
  
  // 2. Split into chunks (300-500 tokens)
  const chunks = splitIntoChunks(text, 300);
  
  // 3. Create embeddings for each chunk
  const embeddings = await openai.createEmbeddings(chunks);
  
  // 4. Store in vector database
  await supabase.from('manual_chunks').insert(
    chunks.map((chunk, i) => ({
      machine_id: machineId,
      content: chunk,
      embedding: embeddings[i],
      source_file: pdfPath
    }))
  );
};
```

#### 1.2 Structure Spare Parts Catalog

**Database Schema:**
```sql
-- Spare parts with AI metadata
CREATE TABLE spare_parts_with_ai (
  id UUID PRIMARY KEY,
  part_number VARCHAR UNIQUE,
  name VARCHAR,
  description TEXT,
  machine_ids UUID[] -- Which machines use this part
  failure_modes TEXT[] -- Common reasons this part fails
  replacement_difficulty VARCHAR, -- 'easy', 'moderate', 'complex'
  estimated_replacement_time INTEGER, -- minutes
  common_issues TEXT, -- AI-searchable text about when to use
  embedding VECTOR -- For semantic search
);

-- Link repairs to parts
CREATE TABLE repair_history (
  id UUID PRIMARY KEY,
  machine_id UUID,
  problem_description TEXT,
  symptoms TEXT[],
  parts_used UUID[], -- Links to spare_parts_with_ai
  resolution TEXT,
  downtime_hours FLOAT,
  created_at TIMESTAMP
);
```

#### 1.3 Create Machine Knowledge Base

**Store machine specifications:**
```javascript
const machineKnowledgeBase = {
  machineId: "cnc-lathe-001",
  manufacturer: "Siemens",
  model: "SINUMERIK 840D",
  yearManufactured: 2018,
  criticalParts: [
    "servo_motor",
    "spindle_bearing",
    "hydraulic_pump"
  ],
  failureRates: {
    "servo_motor": 0.02, // 2% annual failure rate
    "spindle_bearing": 0.015,
    "hydraulic_pump": 0.01
  },
  averageDowntimePerFailure: {
    "servo_motor": 4, // hours
    "spindle_bearing": 2,
    "hydraulic_pump": 3
  }
};
```

---

### Phase 2: Backend AI API (Week 2-3)

#### 2.1 Create Diagnosis Endpoint

**Endpoint:** `POST /api/ai/diagnose`

```javascript
// server/routes/ai.js
import { OpenAI } from 'openai';
import { supabase } from '../lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const diagnoseIssue = async (req, res) => {
  const {
    machineId,
    symptoms,        // "Motor is making noise"
    errorCodes,      // ["E502", "E503"]
    context          // "Issue started after 5000 hours of operation"
  } = req.body;

  try {
    // Step 1: Retrieve relevant manual sections
    const relevantManuals = await retrieveRelevantManuals(
      machineId,
      symptoms
    );

    // Step 2: Get historical repairs for similar symptoms
    const historicalRepairs = await supabase
      .from('repair_history')
      .select('*')
      .eq('machine_id', machineId)
      .textSearch('problem_description', symptoms)
      .limit(5);

    // Step 3: Get spare parts that commonly fail with these symptoms
    const relevantParts = await getRelevantSpareparts(
      machineId,
      symptoms,
      errorCodes
    );

    // Step 4: Prepare RAG context
    const ragContext = `
Machine: ${machineId}
Symptoms: ${symptoms}
Error Codes: ${errorCodes.join(', ')}

RELEVANT MANUAL SECTIONS:
${relevantManuals.map(m => m.content).join('\n\n')}

HISTORICAL REPAIRS:
${historicalRepairs.data
  .map(r => `- ${r.problem_description} -> Resolved by: ${r.resolution}`)
  .join('\n')}

COMMON SPARE PARTS FOR THIS MACHINE:
${relevantParts.map(p => `- ${p.name}: ${p.description}`).join('\n')}
    `;

    // Step 5: Call LLM with context
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert maintenance technician AI for industrial machinery.
          Your job is to:
          1. Diagnose the problem from symptoms
          2. Provide step-by-step troubleshooting
          3. Recommend spare parts needed
          4. Estimate repair difficulty and time
          
          Always cite the manual sections you reference.
          Be precise and safety-conscious.`
        },
        {
          role: 'user',
          content: `${ragContext}\n\nContext: ${context}\n\nProvide a detailed diagnosis with recommendations.`
        }
      ],
      temperature: 0.3, // Lower temp for consistency
      max_tokens: 2000
    });

    // Step 6: Extract spare parts from response
    const extractedParts = await extractSparepartsFromAI(
      response.choices[0].message.content,
      relevantParts
    );

    // Step 7: Save diagnosis for learning
    await supabase.from('ai_diagnoses').insert({
      machine_id: machineId,
      symptoms,
      error_codes: errorCodes,
      ai_diagnosis: response.choices[0].message.content,
      recommended_parts: extractedParts,
      created_at: new Date()
    });

    res.json({
      diagnosis: response.choices[0].message.content,
      recommendedParts: extractedParts,
      troubleshootingSteps: parseTroubleshootingSteps(
        response.choices[0].message.content
      ),
      estimatedDowntime: estimateDowntime(extractedParts),
      confidence: calculateConfidence(historicalRepairs.data)
    });

  } catch (error) {
    console.error('AI Diagnosis Error:', error);
    res.status(500).json({ error: 'Diagnosis failed' });
  }
};

// Helper: Retrieve relevant manual sections using vector search
const retrieveRelevantManuals = async (machineId, symptoms) => {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: symptoms
  });

  const { data } = await supabase.rpc('match_manual_sections', {
    query_embedding: embedding.data[0].embedding,
    match_threshold: 0.7,
    match_count: 5,
    filter_machine_id: machineId
  });

  return data;
};

// Helper: Get spare parts for this machine/symptoms
const getRelevantSpareparts = async (machineId, symptoms, errorCodes) => {
  let query = supabase
    .from('spare_parts_with_ai')
    .select('*')
    .contains('machine_ids', [machineId]);

  // Filter by common issues that match symptoms
  if (symptoms) {
    query = query.textSearch('common_issues', symptoms);
  }

  const { data } = await query.limit(10);
  return data;
};

// Helper: Parse troubleshooting steps from AI response
const parseTroubleshootingSteps = (text) => {
  const steps = [];
  const lines = text.split('\n');
  let currentStep = null;

  lines.forEach(line => {
    if (/^\d+\./.test(line)) {
      steps.push(line);
    }
  });

  return steps;
};
```

#### 2.2 Create Chat Interface Endpoint

**Endpoint:** `POST /api/ai/chat`

```javascript
export const chatWithAI = async (req, res) => {
  const { machineId, messages, sessionId } = req.body;

  try {
    // Load session history
    const sessionHistory = await supabase
      .from('ai_chat_sessions')
      .select('messages')
      .eq('id', sessionId)
      .single();

    const allMessages = [
      ...sessionHistory.data.messages,
      { role: 'user', content: messages[messages.length - 1].content }
    ];

    // Call LLM with full context
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...allMessages
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const aiMessage = response.choices[0].message.content;

    // Save to session
    await supabase.from('ai_chat_sessions')
      .update({
        messages: [
          ...allMessages,
          { role: 'assistant', content: aiMessage }
        ]
      })
      .eq('id', sessionId);

    res.json({ response: aiMessage });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
};
```

---

### Phase 3: Frontend UI Component (Week 3-4)

#### 3.1 Create AI Assistant Component

**File:** `src/components/modules/MaintenanceAIAssistant.jsx`

```javascript
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const MaintenanceAIAssistant = ({ machineId, machineName }) => {
  const [messages, setMessages] = useState([]);
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDiagnose = async () => {
    if (!symptoms.trim()) return;

    setLoading(true);
    setMessages(prev => [\...prev, { role: 'user', content: symptoms }]);

    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          symptoms,
          errorCodes: [], // Could be extracted from form
          context: 'Issue reported by technician'
        })
      });

      const data = await response.json();
      setDiagnosis(data);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.diagnosis }
      ]);
      setSymptoms('');
    } catch (error) {
      console.error('Diagnosis error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, diagnosis failed. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <h1 className="text-2xl font-bold">🤖 AI Maintenance Assistant</h1>
        <p className="text-blue-100 mt-1">Machine: {machineName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p>Describe the machine problem and I'll help you diagnose it!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl p-4 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}

        {/* Diagnosis Results */}
        {diagnosis && (
          <Card className="mt-6 p-6 border-green-500">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Recommended Actions
            </h3>

            {/* Troubleshooting Steps */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Troubleshooting Steps:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                {diagnosis.troubleshootingSteps.map((step, i) => (
                  <li key={i} className="text-gray-700">{step}</li>
                ))}
              </ol>
            </div>

            {/* Recommended Parts */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Recommended Spare Parts:</h4>
              <div className="space-y-2">
                {diagnosis.recommendedParts.map((part, i) => (
                  <div key={i} className="bg-blue-50 p-3 rounded flex justify-between items-center">
                    <div>
                      <p className="font-medium">{part.name}</p>
                      <p className="text-xs text-gray-600">{part.part_number}</p>
                    </div>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                      {part.replacement_difficulty}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated Downtime */}
            <div className="bg-yellow-50 p-3 rounded text-sm">
              <p><strong>Estimated Downtime:</strong> {diagnosis.estimatedDowntime} hours</p>
              <p><strong>Confidence:</strong> {(diagnosis.confidence * 100).toFixed(0)}%</p>
            </div>
          </Card>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex gap-2">
          <Input
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleDiagnose()}
            placeholder="Describe the problem... (e.g., 'Motor is making noise and temperature is too high')"
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={handleDiagnose}
            disabled={loading || !symptoms.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceAIAssistant;
```

---

## 🔌 Integration with Your Existing System

### Add to Maintenance Dashboard

```javascript
// src/pages/MaintenanceDashboard.jsx
import MaintenanceAIAssistant from '@/components/modules/MaintenanceAIAssistant';
import Scanner from '@/components/modules/Scanner';

export default function MaintenanceDashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: Scanner */}
      <div>
        <h2>Inventory</h2>
        <Scanner />
      </div>

      {/* Right: AI Assistant */}
      <div>
        <MaintenanceAIAssistant machineId={selectedMachine.id} />
      </div>
    </div>
  );
}
```

---

## 📊 Advanced Features

### 1. Predictive Maintenance

```javascript
// Predict failures before they happen
const predictFailures = async (machineId) => {
  const machineData = await getMachineMetrics(machineId);
  
  const prediction = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'user',
      content: `Based on these metrics: ${JSON.stringify(machineData)}
                What parts are likely to fail in the next 30 days?`
    }]
  });
  
  return prediction;
};
```

### 2. Spare Parts Optimization

```javascript
// Recommend optimal inventory levels
const optimizeInventory = async () => {
  const repairHistory = await getRepairHistory();
  
  const recommendation = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'user',
      content: `Based on this repair history: ${JSON.stringify(repairHistory)}
                What spare parts should we keep in stock and in what quantities?`
    }]
  });
  
  return recommendation;
};
```

### 3. Root Cause Analysis

```javascript
// Analyze why failures keep happening
const rootCauseAnalysis = async (machineId) => {
  const failures = await getRepeatedFailures(machineId);
  
  const analysis = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'user',
      content: `This machine has repeated failures: ${JSON.stringify(failures)}
                What is the root cause and how can we prevent it?`
    }]
  });
  
  return analysis;
};
```

---

## 🛠️ Setup Instructions

### Step 1: Install Dependencies

```bash
npm install openai langchain pdf-parse pdfplumber
```

### Step 2: Set Environment Variables

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
PINECONE_API_KEY=... # Or use Supabase pgvector
SUPABASE_URL=...
SUPABASE_KEY=...
```

### Step 3: Create Database Tables

```sql
-- Already prepared in Database Setup section above
```

### Step 4: Ingest Your Manuals

```bash
node scripts/ingestManuals.js --dir ./manuals
```

---

## 💡 Best Practices

✅ **Keep AI Responses Grounded**
- Always provide manual references
- Include confidence levels
- Suggest escalation for complex issues

✅ **Continuous Learning**
- Store all diagnoses and their outcomes
- Fine-tune on your specific machinery
- Feedback loop: Did the diagnosis work?

✅ **Safety First**
- Never provide safety-critical advice without human review
- Always recommend consulting manuals
- Include warnings about electrical/moving parts

✅ **Cost Optimization**
- Track part recommendations vs. actual parts used
- Optimize for minimal downtime + minimal cost
- Consider supply chain (lead times)

---

## 🚀 Timeline

| Phase | Duration | Deliverables |
|-------|----------|---------------|
| **Phase 1: Data** | Week 1-2 | PDF ingestion pipeline, spare parts schema |
| **Phase 2: Backend** | Week 2-3 | API endpoints, RAG system |
| **Phase 3: Frontend** | Week 3-4 | UI components, chat interface |
| **Phase 4: Integration** | Week 4-5 | Dashboard integration, testing |
| **Phase 5: Optimization** | Week 5-6 | Fine-tuning, user feedback, deployments |

**Total: ~6 weeks for MVP**

---

## 📚 Resources

- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
- [LangChain for RAG](https://python.langchain.com/docs/use_cases/question_answering/)
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [PDF.js for Document Processing](https://mozilla.github.io/pdf.js/)

---

## ❓ FAQ

**Q: Can we use open-source models instead of GPT-4?**
A: Yes! Consider Llama 2, Mistral, or local models. Trade-off: slightly lower quality but better privacy/cost.

**Q: How much does this cost?**
A: GPT-4 API: ~$0.03-0.06 per diagnosis. ~100 diagnoses/day = $3-6/day = $100-200/month.

**Q: What if we don't have all manuals as PDFs?**
A: Start with what you have. Manually add missing documentation. Crowd-source from technician expertise.

**Q: Can this replace technicians?**
A: No. It's a force multiplier. Junior technicians can solve 70% of issues independently. Senior techs focus on complex cases.

---

Let's build this together! 🚀
