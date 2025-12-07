import React, { useState, useMemo } from 'react';
import { Mail, Copy, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * EmailTemplateGenerator Component
 * Generates professional email templates with Quote ID for easy tracking
 */
const EmailTemplateGenerator = ({ quoteData, supplierData, partData, quoteId = '', showCopyOnly = false }) => {
  const [copied, setCopied] = useState(false);
  const [emailFormat, setEmailFormat] = useState('professional');

  // Generate email subject with Quote ID - memoized
  const subject = useMemo(() => {
    if (!quoteData || !supplierData) return '';
    const partName = partData?.name || 'Part';
    const quantity = quoteData.quantity_requested || quoteData.quantity || 1;
    const idPart = quoteId ? ` [${quoteId}]` : '';
    return `Quote Request: ${quantity}x ${partName}${idPart}`;
  }, [partData, quoteData, supplierData, quoteId]);

  // Generate email body based on format - memoized
  const emailBody = useMemo(() => {
    if (!quoteData || !supplierData) return '';
    
    const partName = partData?.name || 'Unknown Part';
    const partSku = partData?.sku || 'N/A';
    const quantity = quoteData.quantity_requested || quoteData.quantity || 1;
    const deliveryNeed = quoteData.deliveryDate || 'As soon as possible';
    const specialNotes = quoteData.request_notes || quoteData.specialNotes || '';
    const budgetExpectation = quoteData.budgetExpectation || '';
    const requesterName = quoteData.requesterName || 'The PartPulse Team';
    const requesterEmail = quoteData.requesterEmail || 'noreply@partpulse.eu';
    const requesterPhone = quoteData.requesterPhone || '';
    const companyName = quoteData.companyName || 'PartPulse Industrial';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const quoteIdSection = quoteId ? `\nQuote Request ID: ${quoteId}\n` : '';

    const baseInfo = `Dear ${supplierData.name || 'Supplier'},

We are reaching out regarding a quote request for the following item:
${quoteIdSection}
------- QUOTE REQUEST DETAILS -------

Part Information:
  • Part Name: ${partName}
  • Part SKU: ${partSku}
  • Quantity Needed: ${quantity} units

Delivery Requirements:
  • Requested Delivery Date: ${deliveryNeed}
  • Delivery Location: ${quoteData.deliveryLocation || 'To be confirmed'}

Budget & Preferences:
${budgetExpectation ? `  • Budget Expectation: ${budgetExpectation}\n` : ''}`;

    const specialNotesSection = specialNotes
      ? `\nSpecial Instructions & Notes:\n  ${specialNotes}\n`
      : '';

    const closingInfo = `\n------- REQUESTOR INFORMATION -------\n
${requesterName}
${requesterEmail}
${requesterPhone ? `Phone: ${requesterPhone}\n` : ''}${companyName}\n\n`;

    if (emailFormat === 'professional') {
      return (
        baseInfo +
        `\n${specialNotesSection}\n` +
        closingInfo +
        `We would appreciate your detailed quotation including:\n` +
        `  • Unit price and total cost
  • Availability and lead time
  • Delivery terms and freight cost (if applicable)
  • Payment terms
  • Any volume discounts available
  • Warranty information
\nPlease reply with your quotation at your earliest convenience. Reference the Quote ID (${quoteId}) in your response for easy tracking.

Thank you for your prompt attention to this request.

Best regards,
${requesterName}
${companyName}
${requesterEmail}
${requesterPhone ? `${requesterPhone}\n` : ''}
www.partpulse.eu

Quote Generated: ${date}`
      );
    }

    if (emailFormat === 'casual') {
      return (
        `Hi ${supplierData.name || 'there'},

Hope you're doing well! We're looking for a quote on a part and thought of you.
${quoteIdSection}
**What We Need:**
• Part: ${partName} (SKU: ${partSku})
• Quantity: ${quantity} units
• Needed by: ${deliveryNeed}

${specialNotesSection}` +
        closingInfo +
        `Could you send us your best quote? We're looking for:
• Your pricing
• How quickly you can deliver
• Any bulk discounts
• Your payment terms

Please reference the Quote ID (${quoteId}) in your reply so we can track everything easily.

Thanks a bunch!

${requesterName}
${companyName}
${requesterEmail}
${requesterPhone ? `${requesterPhone}\n` : ''}`
      );
    }

    if (emailFormat === 'technical') {
      return (
        baseInfo +
        `\nTechnical Requirements:\n` +
        `  • Part SKU/Model: ${partSku}
  • Quantity: ${quantity} units
  • Target Delivery: ${deliveryNeed}
${specialNotesSection}` +
        closingInfo +
        `Expected Quotation Elements:
` +
        `  1. Unit cost breakdown
  2. Lead time and availability
  3. Shipping terms and cost
  4. Quality certifications/specs
  5. Payment terms (Net 30/60/90)
  6. Warranty/RMA policy
  7. Technical support availability

Please ensure your quotation includes all technical specifications and compliance documentation if applicable.
Reference Quote ID (${quoteId}) for tracking.

Regards,
${requesterName}
${companyName}
${requesterEmail}
${requesterPhone ? `${requesterPhone}\n` : ''}

Generated via PartPulse
Date: ${date}`
      );
    }
  }, [emailFormat, quoteData, supplierData, partData, quoteId]);

  const handleCopyToClipboard = () => {
    const fullEmail = `SUBJECT: ${subject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullEmail).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenInOutlook = () => {
    const mailtoLink = `mailto:${supplierData?.email || ''}
      ?subject=${encodeURIComponent(subject)}
      &body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
  };

  const handleOpenInGmail = () => {
    const gmailLink = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(supplierData?.email || '')}
      &su=${encodeURIComponent(subject)}
      &body=${encodeURIComponent(emailBody)}`;
    window.open(gmailLink, '_blank');
  };

  // If data is missing, render error state BUT AFTER HOOKS are called
  if (!quoteData || !supplierData) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <span className="text-sm text-yellow-700 dark:text-yellow-300">
          Missing quote or supplier data for email template
        </span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Email Format
        </label>
        <select
          value={emailFormat}
          onChange={(e) => setEmailFormat(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="professional">Professional (Formal)</option>
          <option value="casual">Casual (Friendly)</option>
          <option value="technical">Technical (Detailed Specs)</option>
        </select>
      </div>

      {/* Email Preview */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Email Preview
        </label>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          {/* Subject Line */}
          <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Subject
            </p>
            <p className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100 mt-1 break-all">{subject}</p>
          </div>

          {/* Email Body */}
          <div className="px-4 py-3 max-h-96 overflow-y-auto">
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {emailBody}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!showCopyOnly && (
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Copy to Clipboard */}
          <button
            onClick={handleCopyToClipboard}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              copied
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Email Text
              </>
            )}
          </button>

          {/* Send with Outlook (mailto) */}
          {supplierData.email && (
            <button
              onClick={handleOpenInOutlook}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              title="Open in your default email client"
            >
              <Mail className="w-4 h-4" />
              Open in Outlook
            </button>
          )}

          {/* Send with Gmail */}
          {supplierData.email && (
            <button
              onClick={handleOpenInGmail}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <ExternalLink className="w-4 h-4" />
              Send via Gmail
            </button>
          )}
        </div>
      )}

      {/* Copy Only Mode (for step 4) */}
      {showCopyOnly && (
        <button
          onClick={handleCopyToClipboard}
          className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            copied
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Full Email (Subject + Body)
            </>
          )}
        </button>
      )}

      {/* Info */}
      {!showCopyOnly && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>💡 Tip:</strong> The Quote ID ({quoteId}) is included in the email subject for easy tracking.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateGenerator;