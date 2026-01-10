import React, { useState, useMemo } from 'react';
import { Mail, Copy, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { getTemplate } from './emailTemplates';

/**
 * EmailTemplateGenerator Component
 * Generates professional email templates with Quote ID for easy tracking
 * Now supports multiple items with full descriptions, part numbers, and SKU/IDs
 * MULTILINGUAL: Supports English (EN) and Bulgarian (BG) templates
 */
const EmailTemplateGenerator = ({ 
  quoteData, 
  supplierData, 
  partData, 
  quoteId = '', 
  showCopyOnly = false, 
  items = [],
  languageCode = 'EN'  // NEW: Language support (EN or BG)
}) => {
  const [copied, setCopied] = useState(false);
  const [emailFormat, setEmailFormat] = useState('professional');

  // Get language-specific templates
  const template = useMemo(() => getTemplate(languageCode), [languageCode]);

  // Determine if we have multiple items (array) or single item (object)
  const isMultipleItems = Array.isArray(items) && items.length > 0;

  // Generate email subject with Quote ID - memoized
  const subject = useMemo(() => {
    if (!supplierData) return '';
    
    let baseSubject;
    
    if (isMultipleItems) {
      baseSubject = template.subject.items(items.length);
    } else if (partData?.name) {
      const quantity = quoteData.quantity_requested || quoteData.quantity || 1;
      baseSubject = template.subject.singleItem(quantity, partData.name);
    } else {
      baseSubject = template.subject.quoteRequest;
    }
    
    return quoteId ? template.subject.withId(baseSubject, quoteId) : baseSubject;
  }, [partData, quoteData, supplierData, quoteId, isMultipleItems, items.length, template]);

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
    const date = new Date().toLocaleDateString(
      languageCode === 'BG' ? 'bg-BG' : 'en-US', 
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
    const deliveryLocation = languageCode === 'BG' 
      ? '155 Булвард Липник, 7005 Русе, България'
      : '155 Blvd. Lipnik, 7005 Ruse, Bulgaria';

    // Quote Details Section - TRANSLATED
    const quoteDetailsSection = `${template.quoteDetails.header}

${template.quoteDetails.quoteId}: ${quoteId || 'N/A'}
${template.quoteDetails.date}: ${date}
${template.quoteDetails.deliveryDate}: ${deliveryNeed}
`;

    // Build items section - TRANSLATED
    let itemsSection = '';
    
    if (isMultipleItems) {
      itemsSection = `\n${template.itemsHeader}\n\n`;
      items.forEach((item, index) => {
        const itemName = item.part?.name || item.name || 'Unknown Item';
        const itemSKU = item.part?.barcode || item.sku || item.barcode || 'N/A';
        const itemQuantity = item.quantity || 1;
        const itemDescription = item.part?.description || item.description || 'No description provided';
        const supplierPartNumber = item.supplier_part_number || item.supplierPartNumber || 'N/A';
        const supplierPartInfo = item.supplier_sku || item.supplierSKU || 'N/A';
        
        itemsSection += `${template.itemLabel(index)}\n`;
        itemsSection += `  ${template.itemFields.partName}: ${itemName}\n`;
        itemsSection += `  ${template.itemFields.supplierPartNumber}: ${supplierPartNumber}\n`;
        itemsSection += `  ${template.itemFields.supplierSku}: ${supplierPartInfo}\n`;
        itemsSection += `  ${template.itemFields.internalId}: ${itemSKU}\n`;
        itemsSection += `\n  ${template.itemFields.quantity}: ${itemQuantity} ${template.itemFields.units}\n`;
        itemsSection += `  ${template.itemFields.description}: ${itemDescription}\n\n`;
      });
    } else if (partData) {
      const partName = partData?.name || 'Unknown Part';
      const partSku = partData?.barcode || 'N/A';
      const quantity = quoteData.quantity_requested || quoteData.quantity || 1;
      const description = partData?.description || partData?.notes || 'No description provided';
      
      itemsSection = `\n${template.itemSingle}\n\n`;
      itemsSection += `${template.itemLabel(0)}\n`;
      itemsSection += `  ${template.itemFields.partName}: ${partName}\n`;
      itemsSection += `  ${template.itemFields.supplierPartNumber}: N/A\n`;
      itemsSection += `  ${template.itemFields.supplierSku}: N/A\n`;
      itemsSection += `  ${template.itemFields.internalId}: ${partSku}\n`;
      itemsSection += `\n  ${template.itemFields.quantity}: ${quantity} ${template.itemFields.units}\n`;
      itemsSection += `  ${template.itemFields.description}: ${description}\n`;
    }

    const baseInfo = `${template.greeting(supplierData.name || 'Supplier')}

${template.intro}

${quoteDetailsSection}` + itemsSection + `
${template.deliveryLocation}: ${deliveryLocation}

${template.budgetPreferences}:
${budgetExpectation ? `  • ${template.budgetExpectation}: ${budgetExpectation}\n` : ''}`;

    const specialNotesSection = specialNotes
      ? `\n${template.specialInstructions}:\n  ${specialNotes}\n`
      : '';

    const closingInfo = `\n${template.requestorInfo}

${requesterName}
${requesterEmail}
${requesterPhone ? `${template.phone}: ${requesterPhone}\n` : ''}${companyName}\n\n`;

    if (emailFormat === 'professional') {
      const instructionsList = template.closeInstructions.items.map(item => `  • ${item}`).join('\n');
      return (
        baseInfo +
        `${specialNotesSection}` +
        closingInfo +
        `${template.closeInstructions.header}\n` +
        `${instructionsList}\n` +
        `\n${template.closingRemark(quoteId)}\n\n` +
        `${template.thankYou}\n\n` +
        `${template.bestRegards}\n` +
        `${requesterName}\n` +
        `${companyName}\n` +
        `${requesterEmail}\n` +
        `${requesterPhone ? `${requesterPhone}\n` : ''}` +
        `${template.website}\n\n` +
        `${template.generated}: ${date}`
      );
    }

    if (emailFormat === 'casual') {
      return (
        `${languageCode === 'BG' ? 'Привет' : 'Hi'} ${supplierData.name || (languageCode === 'BG' ? 'там' : 'there')},\n\n` +
        `${template.casualIntro}\n\n` +
        `${quoteDetailsSection}` +
        itemsSection +
        `${template.deliveryLocation}: ${deliveryLocation}\n` +
        `${specialNotesSection}` +
        closingInfo +
        `${template.casualClosing(quoteId)}\n\n` +
        `${requesterName}\n` +
        `${companyName}\n` +
        `${requesterEmail}\n` +
        `${requesterPhone ? `${requesterPhone}\n` : ''}`
      );
    }

    if (emailFormat === 'technical') {
      const expectationsList = template.technicalExpectations.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n');
      return (
        `${template.greeting(supplierData.name || 'Supplier')}\n\n` +
        `${quoteDetailsSection}` +
        itemsSection +
        `${template.deliveryLocation}: ${deliveryLocation}\n` +
        `${specialNotesSection}` +
        closingInfo +
        `${template.technicalHeader}\n` +
        `${expectationsList}\n\n` +
        `${template.technicalNote}\n` +
        `${languageCode === 'BG' ? 'Справка' : 'Reference'} Quote ID (${quoteId}) ${languageCode === 'BG' ? 'за проследяване.' : 'for tracking.'}\n\n` +
        `${template.bestRegards}\n` +
        `${requesterName}\n` +
        `${companyName}\n` +
        `${requesterEmail}\n` +
        `${requesterPhone ? `${requesterPhone}\n` : ''}\n` +
        `Generated via PartPulse\n` +
        `${template.generated}: ${date}`
      );
    }
  }, [emailFormat, quoteData, supplierData, partData, quoteId, isMultipleItems, items, template, languageCode]);

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
          {languageCode === 'BG' ? 'Формат на имейл' : 'Email Format'}
        </label>
        <select
          value={emailFormat}
          onChange={(e) => setEmailFormat(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="professional">
            {languageCode === 'BG' ? 'Професионален (Формален)' : 'Professional (Formal)'}
          </option>
          <option value="casual">
            {languageCode === 'BG' ? 'Небрежен (Приятелски)' : 'Casual (Friendly)'}
          </option>
          <option value="technical">
            {languageCode === 'BG' ? 'Технически (Детайлни спецификации)' : 'Technical (Detailed Specs)'}
          </option>
        </select>
      </div>

      {/* Email Preview */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {languageCode === 'BG' ? 'Преглед на имейл' : 'Email Preview'}
        </label>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          {/* Subject Line */}
          <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {languageCode === 'BG' ? 'Тема' : 'Subject'}
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
                {languageCode === 'BG' ? 'Копирано в буфера' : 'Copied to Clipboard'}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {languageCode === 'BG' ? 'Копирай текста на имейла' : 'Copy Email Text'}
              </>
            )}
          </button>

          {/* Send with Outlook (mailto) */}
          {supplierData.email && (
            <button
              onClick={handleOpenInOutlook}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              title={languageCode === 'BG' ? 'Отворете в стандартния е-мейл клиент' : 'Open in your default email client'}
            >
              <Mail className="w-4 h-4" />
              {languageCode === 'BG' ? 'Отворете в Outlook' : 'Open in Outlook'}
            </button>
          )}

          {/* Send with Gmail */}
          {supplierData.email && (
            <button
              onClick={handleOpenInGmail}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <ExternalLink className="w-4 h-4" />
              {languageCode === 'BG' ? 'Изпрати през Gmail' : 'Send via Gmail'}
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
              {languageCode === 'BG' ? 'Копирано в буфера!' : 'Copied to Clipboard!'}
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              {languageCode === 'BG' ? 'Копирай пълния имейл (Тема + Текст)' : 'Copy Full Email (Subject + Body)'}
            </>
          )}
        </button>
      )}

      {/* Info */}
      {!showCopyOnly && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>💡 {languageCode === 'BG' ? 'Съвет' : 'Tip'}:</strong> {languageCode === 'BG' 
              ? 'Детайлите на заявката за оферта, включително ID на оферта, дата и дата на доставка, се показват в началото на имейла.' 
              : 'Quote request details including Quote ID, Date, and Delivery Date are shown at the top of the email.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateGenerator;