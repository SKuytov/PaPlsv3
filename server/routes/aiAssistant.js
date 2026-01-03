import express from 'express';
import { OpenAI } from 'openai';
import { supabase } from '../lib/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Determine which AI provider to use
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'; // 'openai', 'perplexity', or 'ollama'

// Initialize AI client based on provider
let aiClient;

if (AI_PROVIDER === 'perplexity') {
  // Perplexity uses OpenAI-compatible API
  aiClient = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai'
  });
} else if (AI_PROVIDER === 'ollama') {
  aiClient = new OpenAI({
    apiKey: 'ollama', // Ollama doesn't need real API key
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
  });
} else {
  // Default: OpenAI
  aiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || ''
  });
}

// System prompt for maintenance diagnosis (MULTI-LANGUAGE SUPPORT)
const SYSTEM_PROMPT = `You are an expert industrial machinery maintenance technician AI assistant with multi-language capabilities.

Your primary responsibilities:
1. Diagnose machine problems from detailed symptom descriptions in ANY language
2. Provide step-by-step troubleshooting procedures
3. Recommend specific spare parts with part numbers when available
4. Estimate repair difficulty (easy/moderate/complex) and time in hours
5. Reference relevant manual sections and technical documentation
6. Always prioritize safety and operational continuity
7. Escalate complex issues to human experts when necessary
8. Search online resources for manufacturer-specific solutions

MULTI-LANGUAGE INSTRUCTIONS:
- If the user writes in Bulgarian, respond in Bulgarian
- If the user writes in English, respond in English
- If the user writes in Italian, respond in Italian
- If the user writes in German, respond in German
- Always match the user's language for the response
- When referencing manuals in other languages, provide translations of key sections
- Technical terms can remain in English if needed, but provide Bulgarian/Italian/German explanations

For Perplexity AI:
- Use your web search capability to find:
  * Official manufacturer documentation and manuals
  * Technical forums discussing similar issues
  * Parts catalogs and availability
  * Recent recalls or known issues
  * Video tutorials and repair guides
- Cite sources when available

Response Format Requirements:
- **Root Cause**: Start with most likely root cause
- **Troubleshooting Steps**: Number each step clearly (1., 2., 3., etc.)
- **Spare Parts**: List each part with estimated quantity and priority
- **Estimated Time**: Include range (e.g., 2-4 hours)
- **Difficulty Level**: Mark as Easy/Moderate/Complex
- **Safety Notes**: Any warnings or precautions
- **Next Steps**: What to do if issue persists
- **Sources**: If using Perplexity, cite online sources found

Always be:
- Precise and technical in language
- Safety-conscious and risk-aware
- Honest about uncertainty levels
- Practical and action-oriented
- Reference historical solutions when relevant`;

// Get appropriate model based on provider
const getModelName = () => {
  if (AI_PROVIDER === 'perplexity') {
    // Perplexity models with web search
    return process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-large-128k-online';
  } else if (AI_PROVIDER === 'ollama') {
    return process.env.OLLAMA_MODEL || 'mistral';
  } else {
    return process.env.OPENAI_MODEL || 'gpt-4';
  }
};

/**
 * POST /api/ai/diagnose
 * Main diagnosis endpoint with multi-language and multi-provider support
 * Body: { machineId, symptoms, errorCodes?, context?, language? }
 */
router.post('/diagnose', async (req, res) => {
  const { machineId, symptoms, errorCodes = [], context = '', language = 'auto' } = req.body;

  try {
    console.log('[AI] Diagnosis request for machine:', machineId);
    console.log('[AI] Provider:', AI_PROVIDER);
    console.log('[AI] Symptoms:', symptoms);
    console.log('[AI] Language:', language);

    if (!machineId || !symptoms) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: machineId and symptoms'
      });
    }

    // Retrieve machine information
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .single();

    if (machineError) {
      console.warn('[AI] Machine not found:', machineId);
    }

    // Retrieve recent repair history for context
    const { data: history, error: historyError } = await supabase
      .from('repair_history')
      .select('*')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (historyError) {
      console.warn('[AI] Could not fetch repair history:', historyError.message);
    }

    // Retrieve similar past diagnoses for learning
    const { data: similarDiagnoses, error: diagError } = await supabase
      .from('ai_diagnoses')
      .select('*')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (diagError) {
      console.warn('[AI] Could not fetch past diagnoses');
    }

    // Build context for AI (with language instruction)
    const languageInstruction = language !== 'auto' 
      ? `\n\nIMPORTANT: Respond in ${language} language.`
      : '';

    const aiContext = `
MACHINE INFORMATION:
Name: ${machine?.name || 'Unknown'}
Model: ${machine?.model || 'Unknown'}
Manufacturer: ${machine?.manufacturer || 'Unknown'}
Year: ${machine?.year_manufactured || 'Unknown'}
Hours of Operation: ${machine?.operating_hours || 'Unknown'}

CURRENT ISSUE:
Symptoms: ${symptoms}
Error Codes: ${errorCodes.length > 0 ? errorCodes.join(', ') : 'None'}
Additional Context: ${context || 'None provided'}

RECENT REPAIR HISTORY (Last 5):
${history && history.length > 0 
  ? history.map((h, i) => `${i + 1}. [${new Date(h.created_at).toLocaleDateString()}] Problem: ${h.problem_description || 'N/A'} - Resolution: ${h.resolution || 'N/A'}${h.parts_used ? ' - Parts: ' + h.parts_used.join(', ') : ''}`).join('\n')
  : 'No recent repair history'}

PAST SIMILAR DIAGNOSES:
${similarDiagnoses && similarDiagnoses.length > 0
  ? similarDiagnoses.map((d, i) => `${i + 1}. Symptoms: ${d.symptoms || 'N/A'} - Diagnosis Status: ${d.status || 'pending'}`).join('\n')
  : 'No past diagnoses'}
${languageInstruction}
    `.trim();

    console.log('[AI] Sending to AI provider:', AI_PROVIDER);
    console.log('[AI] Model:', getModelName());

    // Call AI API (works for OpenAI, Perplexity, and Ollama)
    const response = await aiClient.chat.completions.create({
      model: getModelName(),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: aiContext }
      ],
      temperature: 0.3, // Lower temperature for consistency
      max_tokens: 2500,
      top_p: 0.9,
      // Perplexity-specific: enable web search
      ...(AI_PROVIDER === 'perplexity' && {
        return_citations: true,
        search_domain_filter: ['youtube.com', 'reddit.com'], // Optional: focus on helpful domains
        search_recency_filter: 'month' // Optional: prefer recent content
      })
    });

    const diagnosis = response.choices[0].message.content;

    // Extract citations if using Perplexity
    const citations = response.citations || [];

    console.log('[AI] Diagnosis complete. Saving to database...');

    // Save diagnosis for learning and audit trail
    const { data: savedDiagnosis, error: saveError } = await supabase
      .from('ai_diagnoses')
      .insert({
        machine_id: machineId,
        symptoms,
        error_codes: errorCodes,
        ai_response: diagnosis,
        user_context: context,
        created_at: new Date(),
        status: 'pending_verification',
        model_used: `${AI_PROVIDER}:${getModelName()}`,
        tokens_used: response.usage?.total_tokens || 0,
        language_detected: language
      })
      .select()
      .single();

    if (saveError) {
      console.warn('[AI] Could not save diagnosis:', saveError.message);
    }

    console.log('[AI] Diagnosis saved. Returning to client.');

    res.json({
      success: true,
      diagnosis,
      citations, // Include web sources if using Perplexity
      machineInfo: {
        id: machine?.id,
        name: machine?.name,
        model: machine?.model,
        manufacturer: machine?.manufacturer,
        operatingHours: machine?.operating_hours
      },
      diagnosisId: savedDiagnosis?.id,
      tokensUsed: response.usage?.total_tokens || 0,
      provider: AI_PROVIDER,
      model: getModelName(),
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[AI] Diagnosis Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Diagnosis failed. Please try again.',
      errorType: error.constructor.name,
      provider: AI_PROVIDER
    });
  }
});

/**
 * POST /api/ai/chat
 * Follow-up conversation endpoint
 * Body: { machineId, message, conversationHistory?, language? }
 */
router.post('/chat', async (req, res) => {
  const { machineId, message, conversationHistory = [], language = 'auto' } = req.body;

  try {
    console.log('[AI] Chat request for machine:', machineId);

    if (!machineId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: machineId and message'
      });
    }

    // Build messages array with language instruction
    const languageInstruction = language !== 'auto'
      ? `\n\nIMPORTANT: Respond in ${language} language.`
      : '';

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + languageInstruction },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Call AI API
    const response = await aiClient.chat.completions.create({
      model: getModelName(),
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      top_p: 0.9,
      // Perplexity-specific
      ...(AI_PROVIDER === 'perplexity' && {
        return_citations: true
      })
    });

    const aiMessage = response.choices[0].message.content;
    const citations = response.citations || [];

    console.log('[AI] Chat response generated.');

    res.json({
      success: true,
      response: aiMessage,
      citations,
      tokensUsed: response.usage?.total_tokens || 0,
      provider: AI_PROVIDER,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[AI] Chat Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Chat failed. Please try again.',
      errorType: error.constructor.name
    });
  }
});

/**
 * POST /api/ai/feedback
 * Store feedback on diagnosis accuracy
 * Body: { diagnosisId, feedback, isAccurate, actualResolution? }
 */
router.post('/feedback', async (req, res) => {
  const { diagnosisId, feedback, isAccurate, actualResolution } = req.body;

  try {
    console.log('[AI] Feedback received for diagnosis:', diagnosisId);

    const { data, error } = await supabase
      .from('ai_diagnoses')
      .update({
        status: isAccurate ? 'verified_correct' : 'verified_incorrect',
        feedback,
        actual_resolution: actualResolution,
        verified_at: new Date()
      })
      .eq('id', diagnosisId)
      .select()
      .single();

    if (error) throw error;

    console.log('[AI] Feedback saved. Status:', data?.status);

    res.json({
      success: true,
      message: 'Feedback recorded. Thank you for helping us improve!',
      diagnosisStatus: data?.status
    });

  } catch (error) {
    console.error('[AI] Feedback Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Could not save feedback'
    });
  }
});

/**
 * GET /api/ai/diagnoses/:machineId
 * Get all diagnoses for a machine
 */
router.get('/diagnoses/:machineId', async (req, res) => {
  const { machineId } = req.params;

  try {
    const { data, error } = await supabase
      .from('ai_diagnoses')
      .select('*')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      diagnoses: data,
      count: data?.length || 0
    });

  } catch (error) {
    console.error('[AI] Get Diagnoses Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/stats
 * Get AI usage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Total diagnoses
    const { count: totalDiagnoses } = await supabase
      .from('ai_diagnoses')
      .select('*', { count: 'exact', head: true });

    // Accurate diagnoses
    const { count: accurateDiagnoses } = await supabase
      .from('ai_diagnoses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'verified_correct');

    // Today's diagnoses
    const today = new Date().toISOString().split('T')[0];
    const { count: todayDiagnoses } = await supabase
      .from('ai_diagnoses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    const accuracy = totalDiagnoses > 0 
      ? ((accurateDiagnoses / totalDiagnoses) * 100).toFixed(1) 
      : 0;

    res.json({
      success: true,
      stats: {
        totalDiagnoses,
        accurateDiagnoses,
        accuracyRate: `${accuracy}%`,
        todayDiagnoses,
        provider: AI_PROVIDER,
        model: getModelName()
      }
    });

  } catch (error) {
    console.error('[AI] Stats Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai/health
 * Health check for AI service
 */
router.get('/health', (req, res) => {
  const hasApiKey = AI_PROVIDER === 'perplexity' 
    ? !!process.env.PERPLEXITY_API_KEY
    : AI_PROVIDER === 'ollama'
    ? true // Ollama doesn't need API key
    : !!process.env.OPENAI_API_KEY;
  
  res.json({
    success: true,
    status: 'operational',
    provider: AI_PROVIDER,
    apiKeyConfigured: hasApiKey,
    model: getModelName(),
    capabilities: {
      webSearch: AI_PROVIDER === 'perplexity',
      multiLanguage: true,
      citations: AI_PROVIDER === 'perplexity'
    },
    timestamp: new Date()
  });
});

export default router;
