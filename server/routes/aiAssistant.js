import express from 'express';
import { OpenAI } from 'openai';
import { supabase } from '../lib/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// System prompt for maintenance diagnosis
const SYSTEM_PROMPT = `You are an expert industrial machinery maintenance technician AI assistant.

Your primary responsibilities:
1. Diagnose machine problems from detailed symptom descriptions
2. Provide step-by-step troubleshooting procedures
3. Recommend specific spare parts with part numbers when available
4. Estimate repair difficulty (easy/moderate/complex) and time in hours
5. Reference relevant manual sections and technical documentation
6. Always prioritize safety and operational continuity
7. Escalate complex issues to human experts when necessary

Response Format Requirements:
- **Root Cause**: Start with most likely root cause
- **Troubleshooting Steps**: Number each step clearly (1., 2., 3., etc.)
- **Spare Parts**: List each part with estimated quantity and priority
- **Estimated Time**: Include range (e.g., 2-4 hours)
- **Difficulty Level**: Mark as Easy/Moderate/Complex
- **Safety Notes**: Any warnings or precautions
- **Next Steps**: What to do if issue persists

Always be:
- Precise and technical in language
- Safety-conscious and risk-aware
- Honest about uncertainty levels
- Practical and action-oriented
- Reference historical solutions when relevant`;

/**
 * POST /api/ai/diagnose
 * Main diagnosis endpoint
 * Body: { machineId, symptoms, errorCodes?, context? }
 */
router.post('/diagnose', async (req, res) => {
  const { machineId, symptoms, errorCodes = [], context = '' } = req.body;

  try {
    console.log('[AI] Diagnosis request for machine:', machineId);
    console.log('[AI] Symptoms:', symptoms);

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

    // Build context for AI
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
    `.trim();

    console.log('[AI] Sending to GPT-4 with context...');

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: aiContext }
      ],
      temperature: 0.3, // Lower temperature for consistency
      max_tokens: 2500,
      top_p: 0.9
    });

    const diagnosis = response.choices[0].message.content;

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
        model_used: process.env.OPENAI_MODEL || 'gpt-4',
        tokens_used: response.usage.total_tokens
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
      machineInfo: {
        id: machine?.id,
        name: machine?.name,
        model: machine?.model,
        manufacturer: machine?.manufacturer,
        operatingHours: machine?.operating_hours
      },
      diagnosisId: savedDiagnosis?.id,
      tokensUsed: response.usage.total_tokens,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('[AI] Diagnosis Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Diagnosis failed. Please try again.',
      errorType: error.constructor.name
    });
  }
});

/**
 * POST /api/ai/chat
 * Follow-up conversation endpoint
 * Body: { machineId, message, conversationHistory? }
 */
router.post('/chat', async (req, res) => {
  const { machineId, message, conversationHistory = [] } = req.body;

  try {
    console.log('[AI] Chat request for machine:', machineId);

    if (!machineId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: machineId and message'
      });
    }

    // Build messages array
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      top_p: 0.9
    });

    const aiMessage = response.choices[0].message.content;

    console.log('[AI] Chat response generated.');

    res.json({
      success: true,
      response: aiMessage,
      tokensUsed: response.usage.total_tokens,
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
        model: process.env.OPENAI_MODEL || 'gpt-4'
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
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  
  res.json({
    success: true,
    status: 'operational',
    apiKeyConfigured: hasApiKey,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    timestamp: new Date()
  });
});

export default router;
