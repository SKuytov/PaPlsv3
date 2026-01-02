import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share2,
  Settings
} from 'lucide-react';

const AIMaintenanceAssistant = ({ machineId, machineName = 'Machine' }) => {
  // State management
  const [messages, setMessages] = useState([]);
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('diagnosis');
  const [feedbackMode, setFeedbackMode] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Main diagnosis handler
  const handleDiagnose = async () => {
    if (!symptoms.trim()) return;

    const userMessage = symptoms;
    setSymptoms('');
    setError(null);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);

    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          symptoms: userMessage,
          errorCodes: [],
          context: 'Issue reported by technician via AI assistant'
        })
      });

      const data = await response.json();

      if (data.success) {
        setDiagnosis(data);
        setConversationHistory([...conversationHistory, { role: 'user', content: userMessage }]);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.diagnosis,
            timestamp: new Date(),
            diagnosisId: data.diagnosisId
          }
        ]);
        setActiveTab('results');
      } else {
        setError(data.error || 'Diagnosis failed');
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: '❌ ' + (data.error || 'Diagnosis failed'), timestamp: new Date() }
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Connection error');
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ Connection error. Please check your internet.', timestamp: new Date() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Follow-up question handler
  const handleChatMessage = async (question) => {
    if (!question.trim()) return;

    setError(null);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: question, timestamp: new Date() }]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          message: question,
          conversationHistory: [
            ...conversationHistory,
            { role: 'user', content: question }
          ]
        })
      });

      const data = await response.json();

      if (data.success) {
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', content: question },
          { role: 'assistant', content: data.response }
        ]);
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.response, timestamp: new Date() }
        ]);
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Submit feedback
  const handleFeedback = async (isAccurate) => {
    if (!diagnosis?.diagnosisId) return;

    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosisId: diagnosis.diagnosisId,
          feedback: feedbackText,
          isAccurate,
          actualResolution: isAccurate ? null : feedbackText
        })
      });

      const data = await response.json();
      if (data.success) {
        setFeedbackMode(null);
        setFeedbackText('');
        alert('Thank you! Your feedback helps us improve.');
      }
    } catch (error) {
      console.error('Feedback Error:', error);
      alert('Could not save feedback');
    }
  };

  // Copy diagnosis to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">🤖 AI Maintenance Assistant</h1>
              <p className="text-blue-100 text-sm">Machine: {machineName}</p>
            </div>
          </div>
          <div className="text-xs bg-blue-700 px-3 py-1 rounded-full">
            {diagnosis ? '✅ Diagnosis Ready' : '⏳ Waiting for input'}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b flex gap-1 p-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab('diagnosis')}
          className={`px-4 py-2 rounded font-medium transition ${
            activeTab === 'diagnosis'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          💬 Problem Description
        </button>
        {diagnosis && (
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded font-medium transition ${
              activeTab === 'results'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Diagnosis Results
          </button>
        )}
        {messages.length > 1 && (
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded font-medium transition ${
              activeTab === 'chat'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💭 Follow-up Questions
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {activeTab === 'diagnosis' && (
          <div className="w-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Lightbulb className="w-16 h-16 text-yellow-400 mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Describe Your Machine Problem</h2>
                  <p className="text-gray-600 max-w-md mb-6">
                    Be as specific as possible. Include symptoms, error codes, and any observations.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg max-w-md text-left text-sm">
                    <p className="font-semibold text-blue-900 mb-2">Example:</p>
                    <p className="text-blue-800">
                      "The CNC lathe spindle is making a grinding noise. Temperature is 95°C (normal is 65°C).
                      Speed is normal but vibration is excessive. Started happening after 8000 hours of operation."
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-2xl p-4 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none shadow'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                      {msg.role === 'assistant' && (
                        <div className="text-xs text-gray-500 mt-2">
                          {msg.timestamp?.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg max-w-md">
                    <div className="flex gap-2 items-start">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Error</p>
                        <p className="text-sm">{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t bg-white p-4 shadow-lg flex-shrink-0">
              <div className="max-w-4xl mx-auto space-y-3">
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleDiagnose();
                    }
                  }}
                  placeholder="Describe the problem in detail... (Ctrl+Enter to send)"
                  disabled={loading}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  rows={3}
                />
                <button
                  onClick={handleDiagnose}
                  disabled={loading || !symptoms.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Get Diagnosis
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && diagnosis && (
          <div className="w-full overflow-y-auto p-6">
            <div className="max-w-4xl">
              {/* Diagnosis Card */}
              <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">📋 AI Diagnosis</h3>
                    <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                      {diagnosis.diagnosis}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(diagnosis.diagnosis)}
                    className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-600 transition"
                    title="Copy diagnosis"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Machine Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Machine Name</p>
                  <p className="font-semibold text-gray-900">{diagnosis.machineInfo?.name}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Model</p>
                  <p className="font-semibold text-gray-900">{diagnosis.machineInfo?.model}</p>
                </div>
              </div>

              {/* Feedback Section */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="font-semibold text-gray-900 mb-3">How accurate was this diagnosis?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFeedbackMode('accurate')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Accurate
                  </button>
                  <button
                    onClick={() => setFeedbackMode('inaccurate')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Needs Work
                  </button>
                </div>
                {feedbackMode && (
                  <div className="mt-4 space-y-2">
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder={feedbackMode === 'accurate' ? 'Any additional notes?' : 'What was incorrect?'}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFeedback(feedbackMode === 'accurate')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      >
                        Submit Feedback
                      </button>
                      <button
                        onClick={() => setFeedbackMode(null)}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Tokens Used</p>
                  <p className="font-semibold text-gray-900">{diagnosis.tokensUsed}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Model</p>
                  <p className="font-semibold text-gray-900">GPT-4</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Generated At</p>
                  <p className="font-semibold text-xs text-gray-900">
                    {new Date(diagnosis.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="w-full flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-2xl p-4 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none shadow'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t bg-white p-4 shadow-lg flex-shrink-0">
              <div className="max-w-4xl mx-auto flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a follow-up question..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleChatMessage(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  disabled={loading}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Ask a follow-up question..."]');
                    handleChatMessage(input.value);
                    input.value = '';
                  }}
                  disabled={loading}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIMaintenanceAssistant;
