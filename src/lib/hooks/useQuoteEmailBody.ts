import { QuoteItem } from './useQuoteItems';

export interface QuoteEmailParams {
  items: QuoteItem[];
  supplier: any;
  quoteId: string;
  formData: {
    deliveryDate?: string;
    budgetExpectation?: string;
    request_notes?: string;
    requesterName?: string;
    requesterEmail?: string;
    requesterPhone?: string;
  };
}

export function useQuoteEmailBody() {
  const generateEmailBody = (params: QuoteEmailParams): string => {
    const { items, supplier, quoteId, formData } = params;

    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const deliveryNeed = formData.deliveryDate
      ? new Date(formData.deliveryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        })
      : 'As soon as possible';

    const requesterName = formData.requesterName || 'Procurement Team';
    const requesterEmail = formData.requesterEmail || 'noreply@partpulse.eu';
    const requesterPhone = formData.requesterPhone || '';

    let emailBody = `Dear ${supplier?.name || 'Supplier'},

We are reaching out regarding a quote request for the following items:

------- QUOTE REQUEST DETAILS -------

Quote ID: ${quoteId}
Date: ${date}
Delivery Date: ${deliveryNeed}

------- REQUESTED ITEMS -------

`;

    items.forEach((item, index) => {
      const itemName = item.part?.name || 'Unknown Item';
      const itemSKU = item.part?.barcode || 'N/A';
      const itemQuantity = item.quantity || 1;
      const itemDescription = item.part?.description || 'No description provided';
      const supplierPartNumber = item.supplierPartNumber || 'N/A';
      const supplierPartSku = item.supplierSku || 'N/A';

      emailBody += `Item ${index + 1}:
`;
      emailBody += `  Part Name: ${itemName}
`;
      emailBody += `  Supplier Part Number: ${supplierPartNumber}
`;
      emailBody += `  Supplier SKU: ${supplierPartSku}
`;
      emailBody += `  SKU/Internal ID: ${itemSKU}
`;
      emailBody += `  Quantity: ${itemQuantity} units
`;
      emailBody += `  Description: ${itemDescription}
\n`;
    });

    emailBody += `Delivery Location: 155 Blvd. Lipnik, 7005 Ruse, Bulgaria

------- REQUESTOR INFORMATION -------

${requesterName}
${requesterEmail}
${requesterPhone ? `${requesterPhone}\n` : ''}PartPulse Industrial
www.partpulse.eu

We would appreciate your detailed quotation including:
  • Unit price and total cost for each item
  • Availability and lead time
  • Delivery terms and freight cost (if applicable)
  • Payment terms
  • Any volume discounts available
  • Warranty information

Please reply with your quotation at your earliest convenience. Reference the Quote ID (${quoteId}) in your response for easy tracking.

Thank you for your prompt attention to this request.

Best regards,
${requesterName}
PartPulse Industrial
${requesterEmail}
${requesterPhone ? `${requesterPhone}\n` : ''}www.partpulse.eu

Quote Generated: ${date}`;

    return emailBody;
  };

  const generateEmailSubject = (items: QuoteItem[], quoteId: string): string => {
    if (items.length === 1) {
      return `Quote Request: ${items[0].quantity}x ${items[0].part?.name} [${quoteId}]`;
    } else {
      return `Quote Request: ${items.length} items [${quoteId}]`;
    }
  };

  return { generateEmailBody, generateEmailSubject };
}
