import React, { useState } from 'react';
import { Mail, Copy, Eye, Send, AlertCircle, Check, ChevronDown } from 'lucide-react';

/**
 * QuoteDistribution Component
 * Send quote requests via email with multiple options:
 * 1. Auto-send via system email
 * 2. Open Outlook with pre-filled email and supplier email
 * 3. Preview and copy email text
 */
const QuoteDistribution = ({ quoteRequests, metadata, onClose, onSent }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [expandedQuotes, setExpandedQuotes] = useState({});
  const [sendingEmails, setSendingEmails] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  // Handle single quote (backward compatibility)
  const quotes = Array.isArray(quoteRequests) ? quoteRequests : [quoteRequests];

  const generateSubject = (quote) => {
    return `Quote Request #${quote.quote_id}${quote.supplier ? ` for ${quote.supplier.name}` : ''}`;
  };

  const generateEmailBody = (quote) => {
    const items = quote.items || [];
    const supplierName = quote.supplier?.name || quote.suppliers?.name;

    let body = `Quote Request Details\n\n`;
    body += `Quote ID: ${quote.quote_id}\n`;
    body += `Date: ${new Date(quote.created_at).toLocaleDateString()}\n`;
    
    if (metadata?.projectName || quote.project_name) {
      body += `Project: ${metadata?.projectName || quote.project_name}\n`;
    }
    
    if (metadata?.deliveryDate || quote.delivery_date) {
      body += `Delivery Date: ${new Date(metadata?.deliveryDate || quote.delivery_date).toLocaleDateString()}\n`;
    }
    
    body += `\n---\n\nITEMS REQUESTED:\n\n`;
    
    items.forEach((item, index) => {
      // Use part_name (always populated)
      const itemName = item.part_name || item.name || 'Item';
      body += `${index + 1}. ${itemName}\n`;
      
      // Add part number if available
      if (item.part_number && !item.is_custom) {
        body += `   Part Number: ${item.part_number}\n`;
      }
      
      // Add description if available
      if (item.description && !item.is_custom) {
        body += `   Description: ${item.description}\n`;
      }
      
      body += `   Quantity: ${item.quantity} ${item.unit_of_measure || 'pcs'}\n`;
      
      if (item.notes) {
        body += `   Notes: ${item.notes}\n`;
      }
      body += `\n`;
    });
    
    if (metadata?.paymentTerms) {
      body += `Payment Terms: ${metadata.paymentTerms}\n`;
    }
    
    if (metadata?.specialRequirements || quote.request_notes) {
      body += `\nSpecial Notes: ${metadata?.specialRequirements || quote.request_notes}\n`;
    }
    
    body += `\n---\n`;
    body += `\nPlease provide your best quote for the above items.\n\n`;
    body += `Thank you,\n`;
    body += `${metadata?.created_by || 'Procurement Team'}`;
    
    return body;
  };

  const handleAutoSend = async (quoteId) => {
    const quote = quotes.find(q => q.id === quoteId || q.quote_id === quoteId);
    if (!quote) return;

    const email = sendingEmails[quoteId];
    if (!email?.trim()) {
      setMessage({ type: 'error', text: 'Please enter recipient email' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/quotes/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.quote_id,
          recipientEmail: email,
          subject: generateSubject(quote),
          body: generateEmailBody(quote)
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Email sent to ${quote.supplier?.name}!` });
        setTimeout(() => {
          onSent?.({ method: 'auto', email, count: quotes.length });
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

  const handleOutlookSend = (quoteId) => {
    const quote = quotes.find(q => q.id === quoteId || q.quote_id === quoteId);
    if (!quote) return;

    const subject = generateSubject(quote);
    const body = generateEmailBody(quote);
    // Auto-fill supplier email if available
    const email = sendingEmails[quoteId] || quote.supplier?.email || '';

    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open Outlook WITHOUT closing the dialog
    window.open(mailtoLink, '_blank');
    
    setMessage({ type: 'success', text: `Outlook opened for ${quote.supplier?.name}. You can send more quotes below.` });
    
    // Collapse this quote to show next one
    setExpandedQuotes(prev => ({
      ...prev,
      [quoteId]: false
    }));
    
    // Auto-expand next quote if available
    const nextQuoteIndex = quotes.findIndex(q => (q.quote_id || q.id) === quoteId) + 1;
    if (nextQuoteIndex < quotes.length) {
      const nextQuote = quotes[nextQuoteIndex];
      setExpandedQuotes(prev => ({
        ...prev,
        [nextQuote.quote_id || nextQuote.id]: true
      }));
    }
  };

  const handleCopyEmail = async (quoteId) => {
    const quote = quotes.find(q => q.id === quoteId || q.quote_id === quoteId);
    if (!quote) return;

    const fullText = `Subject: ${generateSubject(quote)}\n\n${generateEmailBody(quote)}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setMessage({ type: 'success', text: 'Email text copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to copy text' });
    }
  };

  const toggleQuote = (quoteId) => {
    setExpandedQuotes(prev => ({
      ...prev,
      [quoteId]: !prev[quoteId]
    }));
  };

  // Auto-expand first quote on load
  React.useEffect(() => {
    if (quotes.length > 0 && Object.keys(expandedQuotes).length === 0) {
      const firstQuoteId = quotes[0].quote_id || quotes[0].id;
      setExpandedQuotes({ [firstQuoteId]: true });
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-50 to-blue-50 sticky top-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Send Quote Requests</h3>
            <p className="text-sm text-slate-600 mt-1">{quotes.length} quote{quotes.length !== 1 ? 's' : ''} ready to send</p>
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
              <p className="font-semibold text-slate-900">How would you like to send these quote requests?</p>
              
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
                    <p className="text-sm text-slate-600 mt-1">System automatically sends emails to specified recipients</p>
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
                    <p className="text-sm text-slate-600 mt-1">Opens Outlook with pre-filled emails ready to send (supplier emails auto-filled)</p>
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
              {quotes.map(quote => (
                <div key={quote.quote_id || quote.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleQuote(quote.quote_id || quote.id)}>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{quote.supplier?.name || 'Supplier'}</p>
                      <p className="text-xs text-slate-600">Quote #{quote.quote_id}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedQuotes[quote.quote_id || quote.id] ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {expandedQuotes[quote.quote_id || quote.id] && (
                    <div className="space-y-3 border-t pt-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Recipient Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="supplier@company.com"
                          value={sendingEmails[quote.quote_id || quote.id] || ''}
                          onChange={(e) => setSendingEmails({
                            ...sendingEmails,
                            [quote.quote_id || quote.id]: e.target.value
                          })}
                          defaultValue={quote.supplier?.email || ''}
                          className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                        {quote.supplier?.email && (
                          <p className="text-xs text-teal-600 mt-1">✓ Auto-filled from supplier database</p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleAutoSend(quote.quote_id || quote.id)}
                        disabled={loading}
                        className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors text-sm"
                        type="button"
                      >
                        {loading ? '⟳ Sending...' : 'Send Email'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              <button
                onClick={() => setSelectedMethod(null)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
                type="button"
              >
                Back
              </button>
            </div>
          )}

          {/* Outlook Form */}
          {selectedMethod === 'outlook' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                ✓ Click "Open in Outlook" to send each quote. The dialog will stay open so you can send to multiple suppliers.
              </div>
              
              {quotes.map(quote => (
                <div key={quote.quote_id || quote.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleQuote(quote.quote_id || quote.id)}>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{quote.supplier?.name || 'Supplier'}</p>
                      <p className="text-xs text-slate-600">Quote #{quote.quote_id}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedQuotes[quote.quote_id || quote.id] ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {expandedQuotes[quote.quote_id || quote.id] && (
                    <div className="space-y-3 border-t pt-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Recipient Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="supplier@company.com"
                          value={sendingEmails[quote.quote_id || quote.id] || ''}
                          onChange={(e) => setSendingEmails({
                            ...sendingEmails,
                            [quote.quote_id || quote.id]: e.target.value
                          })}
                          defaultValue={quote.supplier?.email || ''}
                          className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {quote.supplier?.email && (
                          <p className="text-xs text-blue-600 mt-1">✓ Auto-filled from supplier database</p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleOutlookSend(quote.quote_id || quote.id)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm"
                        type="button"
                      >
                        <Mail className="h-4 w-4 inline mr-2" />
                        Open in Outlook
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              <button
                onClick={() => setSelectedMethod(null)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
                type="button"
              >
                Back
              </button>
            </div>
          )}

          {/* Preview & Copy */}
          {selectedMethod === 'preview' && (
            <div className="space-y-4">
              {quotes.map(quote => (
                <div key={quote.quote_id || quote.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleQuote(quote.quote_id || quote.id)}>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{quote.supplier?.name || 'Supplier'}</p>
                      <p className="text-xs text-slate-600">Quote #{quote.quote_id}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedQuotes[quote.quote_id || quote.id] ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {expandedQuotes[quote.quote_id || quote.id] && (
                    <div className="space-y-3 border-t pt-3">
                      <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
                        <p className="text-sm font-bold text-slate-900 mb-3">Subject: {generateSubject(quote)}</p>
                        <div className="border-t pt-3">
                          <pre className="text-xs whitespace-pre-wrap break-words text-slate-700 font-mono max-h-48 overflow-y-auto">
                            {generateEmailBody(quote)}
                          </pre>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopyEmail(quote.quote_id || quote.id)}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors text-sm flex items-center justify-center gap-2"
                        type="button"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Email Text
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              <button
                onClick={() => setSelectedMethod(null)}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-semibold transition-colors"
                type="button"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteDistribution;