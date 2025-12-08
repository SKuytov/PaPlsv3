import React, { useState, useMemo } from 'react';
import { Mail, Copy, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * EmailTemplateGenerator Component
 * Generates professional email templates with Quote ID for easy tracking
 * Now supports multiple items with full descriptions, part numbers, and SKU/IDs
 */
const EmailTemplateGenerator = ({ quoteData, supplierData, partData, quoteId = '', showCopyOnly = false, items = [] }) => {
  const [copied, setCopied] = useState(false);
  const [emailFormat, setEmailFormat] = useState('professional');

  // Determine if we have multiple items (array) or single item (object)
  const isMultipleItems = Array.isArray(items) && items.length > 0;

  // Generate email subject with Quote ID - memoized
  const subject = useMemo(() => {
    if (!supplierData) return '';
    
    let subjectText = 'Quote Request';
    
    if (isMultipleItems) {
      subjectText = `Quote Request: ${items.length} items`;
    } else if (partData?.name) {
      const quantity = quoteData.quantity_requested || quoteData.quantity || 1;
      subjectText = `Quote Request: ${quantity}x ${partData.name}`;
    }
    
    const idPart = quoteId ? ` [${quoteId}]` : '';
    return `${subjectText}${idPart}`;
  }, [partData, quoteData, supplierData, quoteId, isMultipleItems, items.length]);

  // Generate email body based on format - memoized
  const emailBody = useMemo(() => {
    if (!quoteData || !supplierData) return '';
    
    const deliveryNeed = quoteData.deliveryDate || 'As soon as possible';
    const specialNotes = quoteData.request_notes || quoteData.specialNotes || '';
    const budgetExpectation = quoteData.budgetExpectation || '';
    const requesterName = quoteData.requesterName || 'The PartPulse Team';
    const requesterEmail = quoteData.requesterEmail || 'noreply@partpulse.eu';
    const requesterPhone = quoteData.requesterPhone || '';
    const companyName = quoteData.companyName || 'PartPulse Industrial';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const deliveryLocation = '155 Blvd. Lipnik, 7005 Ruse, Bulgaria';

    // Quote Details Section
    const quoteDetailsSection = `------- QUOTE REQUEST DETAILS -------

Quote ID: ${quoteId || 'N/A'}
Date: ${date}
Delivery Date: ${deliveryNeed}
`;

    // Build items section
    let itemsSection = '';
    
    if (isMultipleItems) {
      itemsSection = '\n------- REQUESTED ITEMS -------\n\n';
      items.forEach((item, index) => {
        const itemName = item.part?.name || item.name || 'Unknown Item';
        const itemSKU = item.part?.barcode || item.sku || item.barcode || 'N/A';
        const itemQuantity = item.quantity || 1;
        const itemDescription = item.part?.description || item.description || 'No description provided';
        const supplierPartNumber = item.supplier_part_number || item.supplierPartNumber || 'N/A';
        const supplierPartInfo = item.supplier_sku || item.supplierSKU || 'N/A';
        
        itemsSection += `Item ${index + 1}:\n`;
        itemsSection += `  Part Name: ${itemName}\n`;
        itemsSection += `  Supplier Part Number: ${supplierPartNumber}\n`;
        itemsSection += `  Supplier SKU: ${supplierPartInfo}\n`;
        itemsSection += `  SKU/Internal ID: ${itemSKU}\n`;
        itemsSection += `\n  Quantity: ${itemQuantity} units\n`;
        itemsSection += `  Description: ${itemDescription}\n\n`;
      });
    } else if (partData) {
      const partName = partData?.name || 'Unknown Part';
      const partSku = partData?.barcode || 'N/A';
      const quantity = quoteData.quantity_requested || quoteData.quantity || 1;
      const description = partData?.description || partData?.notes || 'No description provided';
      
      itemsSection = `\n------- REQUESTED ITEM -------\n\n`;
      itemsSection += `Item 1:\n`;
      itemsSection += `  Part Name: ${partName}\n`;
      itemsSection += `  Supplier Part Number: N/A\n`;
      itemsSection += `  Supplier SKU: N/A\n`;
      itemsSection += `  SKU/Internal ID: ${partSku}\n`;
      itemsSection += `\n  Quantity: ${quantity} units\n`;
      itemsSection += `  Description: ${description}\n`;
    }

    const baseInfo = `Dear ${supplierData.name || 'Supplier'},

We are reaching out regarding a quote request for the following items:

${quoteDetailsSection}` + itemsSection + `
Delivery Location: ${deliveryLocation}

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
        `${specialNotesSection}` +
        closingInfo +
        `We would appreciate your detailed quotation including:\n` +
        `  • Unit price and total cost for each item
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

Hope you're doing well! We're looking for a quote on some parts and thought of you.

${quoteDetailsSection}` +
        itemsSection +
        `Delivery Location: ${deliveryLocation}
${specialNotesSection}` +
        closingInfo +
        `Could you send us your best quote? We're looking for:
• Your pricing for each item
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
        `Dear ${supplierData.name || 'Supplier'},

${quoteDetailsSection}` +
        itemsSection +
        `Delivery Location: ${deliveryLocation}
${specialNotesSection}` +
        closingInfo +
        `Expected Quotation Elements:
` +
        `  1. Unit cost breakdown per item
  2. Lead time and availability per item
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
  }, [emailFormat, quoteData, supplierData, partData, quoteId, isMultipleItems, items]);

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
            <strong>💡 Tip:</strong> Quote request details including Quote ID, Date, and Delivery Date are shown at the top of the email. All item details with part numbers and SKUs follow.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateGenerator;
