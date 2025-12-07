import React, { useState } from 'react';
import { Mail, Copy, Eye, Send, AlertCircle, Check } from 'lucide-react';

/**
 * QuoteDistribution Component
 * Send quote requests via email with multiple options:
 * 1. Auto-send via system email
 * 2. Open Outlook with pre-filled email
 * 3. Preview and copy email text
 */
const QuoteDistribution = ({ quoteRequest, onClose, onSent }) => {
  const [selectedMethod, setSelectedMethod] = useState(null); // 'auto', 'outlook', 'preview'
  const [sendingEmail, setSendingEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  // Generate email subject
  const generateSubject = () => {
    return `Quote Request #${quoteRequest.id}`;
  };

  // Generate email body
  const generateEmailBody = () => {
    const items = quoteRequest.items || [];
    const suppliers = quoteRequest.suppliers || [];

    let body = `Quote Request Details\n\n`;
    body += `Quote ID: ${quoteRequest.id}\n`;
    body += `Date: ${new Date(quoteRequest.created_at).toLocaleDateString()}\n`;
    
    if (quoteRequest.project) {
      body += `Project: ${quoteRequest.project}\n`;
    }
    
    if (quoteRequest.delivery_date) {
      body += `Delivery Date: ${new Date(quoteRequest.delivery_date).toLocaleDateString()}\n`;
    }
    
    body += `\n---\n\nITEMS REQUESTED:\n\n`;
    
    items.forEach((item, index) => {
      body += `${index + 1}. ${item.part_name || item.name}\n`;
      body += `   Quantity: ${item.quantity} ${item.unit_of_measure || 'pcs'}\n`;
      if (item.notes) {
        body += `   Notes: ${item.notes}\n`;
      }
      body += `\n`;
    });
    
    if (quoteRequest.payment_terms) {
      body += `Payment Terms: ${quoteRequest.payment_terms}\n`;
    }
    
    if (quoteRequest.special_notes) {
      body += `\nSpecial Notes: ${quoteRequest.special_notes}\n`;
    }
    
    body += `\n---\n`;
    body += `\nPlease provide your best quote for the above items.\n\n`;
    body += `Thank you,\n`;
    body += `${quoteRequest.created_by || 'Procurement Team'}`;
    
    return body;
  };

  // Handle auto-send via system email
  const handleAutoSend = async () => {
    if (!sendingEmail.trim()) {
      setMessage({ type: 'error', text: 'Please enter recipient email' });
      return;
    }

    setLoading(true);
    try {
      // Call your backend API to send email
      const response = await fetch('/api/quotes/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quoteRequest.id,
          recipientEmail: sendingEmail,
          subject: generateSubject(),
          body: generateEmailBody()
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email sent successfully!' });
        setTimeout(() => {
          onSent?.({ method: 'auto', email: sendingEmail });
          onClose();
        }, 2000);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Handle Outlook integration
  const handleOutlookSend = () => {
    const subject = generateSubject();
    const body = generateEmailBody();
    const email = sendingEmail || '';

    // Create mailto link with pre-filled information
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open default email client
    window.location.href = mailtoLink;
    
    setMessage({ type: 'success', text: 'Opening your email client...' });
    setTimeout(() => {
      onSent?.({ method: 'outlook', email });
      onClose();
    }, 1500);
  };

  // Copy email text to clipboard
  const handleCopyEmail = async () => {
    const fullText = `Subject: ${generateSubject()}\n\n${generateEmailBody()}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setMessage({ type: 'success', text: 'Email text copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to copy text' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-50 to-blue-50 sticky top-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Send Quote Request</h3>
            <p className="text-sm text-slate-600 mt-1">Quote ID: {quoteRequest.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                {message.text}
              </p>
            </div>
          )}

          {/* Method Selection */}
          {!selectedMethod && (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">How would you like to send this quote request?</p>
              
              {/* Auto-Send Option */}
              <button
                onClick={() => setSelectedMethod('auto')}
                className="w-full p-4 border-2 border-slate-200 hover:border-teal-500 rounded-lg transition-all text-left hover:bg-teal-50 group"
                type="button"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
                    <Send className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">📧 Auto-Send via System Email</p>
                    <p className="text-sm text-slate-600 mt-1">System automatically sends email to specified recipient</p>
                  </div>
                </div>
              </button>

              {/* Outlook Option */}
              <button
                onClick={() => setSelectedMethod('outlook')}
                className="w-full p-4 border-2 border-slate-200 hover:border-blue-500 rounded-lg transition-all text-left hover:bg-blue-50 group"
                type="button"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">💼 Open in Outlook</p>
                    <p className="text-sm text-slate-600 mt-1">Opens Outlook with pre-filled email ready to send</p>
                  </div>
                </div>
              </button>

              {/* Preview Option */}
              <button
                onClick={() => setSelectedMethod('preview')}
                className="w-full p-4 border-2 border-slate-200 hover:border-purple-500 rounded-lg transition-all text-left hover:bg-purple-50 group"
                type="button"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <Eye className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">👀 Preview & Copy</p>
                    <p className="text-sm text-slate-600 mt-1">View email text and copy to clipboard</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Auto-Send Form */}
          {selectedMethod === 'auto' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  placeholder="supplier@company.com"
                  value={sendingEmail}
                  onChange={(e) => setSendingEmail(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-slate-900 mb-2">Email Preview:</p>
                <div className="space-y-2 text-xs">
                  <p><strong>Subject:</strong> {generateSubject()}</p>
                  <p><strong>Body Preview:</strong></p>
                  <pre className="bg-white p-3 rounded border border-slate-200 text-xs overflow-auto max-h-48 whitespace-pre-wrap break-words">
                    {generateEmailBody().substring(0, 300)}...
                  </pre>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAutoSend}
                  disabled={loading}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  type="button"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Email
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedMethod(null)}
                  className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
                  type="button"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Outlook Form */}
          {selectedMethod === 'outlook' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Recipient Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="supplier@company.com"
                  value={sendingEmail}
                  onChange={(e) => setSendingEmail(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Leave blank to fill manually in Outlook</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-slate-900 mb-2">Email Preview:</p>
                <div className="space-y-2 text-xs">
                  <p><strong>Subject:</strong> {generateSubject()}</p>
                  <p><strong>Body Preview:</strong></p>
                  <pre className="bg-white p-3 rounded border border-slate-200 text-xs overflow-auto max-h-48 whitespace-pre-wrap break-words">
                    {generateEmailBody().substring(0, 300)}...
                  </pre>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleOutlookSend}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  type="button"
                >
                  <Mail className="h-4 w-4" />
                  Open in Outlook
                </button>
                <button
                  onClick={() => setSelectedMethod(null)}
                  className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
                  type="button"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Preview & Copy */}
          {selectedMethod === 'preview' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Email Content:</p>
                <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
                  <p className="text-sm font-bold text-slate-900 mb-3">Subject: {generateSubject()}</p>
                  <div className="border-t pt-3">
                    <pre className="text-xs whitespace-pre-wrap break-words text-slate-700 font-mono max-h-96 overflow-y-auto">
                      {generateEmailBody()}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyEmail}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    copied
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  type="button"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy All Text
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedMethod(null)}
                  className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
                  type="button"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteDistribution;