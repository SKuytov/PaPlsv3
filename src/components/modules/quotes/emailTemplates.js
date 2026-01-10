/**
 * Email Template Translation System
 * 
 * Supports: English (EN), Bulgarian (BG)
 * Easy to extend for additional languages
 * 
 * Usage:
 *   import { getTemplate } from './emailTemplates';
 *   const template = getTemplate('BG'); // Bulgarian
 *   const template = getTemplate('EN'); // English (default)
 */

export const emailTemplates = {
  EN: {
    // Email subject line components
    subject: {
      quoteRequest: 'Quote Request',
      items: (count) => `Quote Request: ${count} items`,
      singleItem: (quantity, itemName) => `Quote Request: ${quantity}x ${itemName}`,
      withId: (baseSubject, quoteId) => `${baseSubject} [${quoteId}]`,
    },

    // Email greeting
    greeting: (supplierName) => `Dear ${supplierName || 'Supplier'},`,

    // Intro text
    intro: 'We are reaching out regarding a quote request for the following items:',

    // Quote details section
    quoteDetails: {
      header: '------- QUOTE REQUEST DETAILS -------',
      quoteId: 'Quote ID',
      date: 'Date',
      deliveryDate: 'Delivery Date',
    },

    // Item sections
    itemsHeader: '------- REQUESTED ITEMS -------',
    itemSingle: '------- REQUESTED ITEM -------',
    itemLabel: (index) => `Item ${index + 1}:`,
    itemFields: {
      partName: 'Part Name',
      supplierPartNumber: 'Supplier Part Number',
      supplierSku: 'Supplier SKU',
      internalId: 'SKU/Internal ID',
      quantity: 'Quantity',
      description: 'Description',
      units: 'units',
    },

    // Delivery and preferences
    deliveryLocation: 'Delivery Location',
    budgetPreferences: 'Budget & Preferences',
    budgetExpectation: 'Budget Expectation',
    specialInstructions: 'Special Instructions & Notes',

    // Requestor information
    requestorInfo: '------- REQUESTOR INFORMATION -------',
    phone: 'Phone',

    // Professional format closing instructions
    closeInstructions: {
      header: 'We would appreciate your detailed quotation including:',
      items: [
        'Unit price and total cost for each item',
        'Availability and lead time',
        'Delivery terms and freight cost (if applicable)',
        'Payment terms',
        'Any volume discounts available',
        'Warranty information',
      ],
    },

    // Closing remarks
    closingRemark: (quoteId) =>
      `Please reply with your quotation at your earliest convenience. Reference the Quote ID (${quoteId}) in your response for easy tracking.`,

    thankYou: 'Thank you for your prompt attention to this request.',
    bestRegards: 'Best regards,',
    website: 'www.partpulse.eu',
    generated: 'Quote Generated',

    // Casual format
    casualIntro: 'Hope you\'re doing well! We\'re looking for a quote on some parts and thought of you.',
    casualClosing: (quoteId) =>
      `Could you send us your best quote? We're looking for:\n• Your pricing for each item\n• How quickly you can deliver\n• Any bulk discounts\n• Your payment terms\n\nPlease reference the Quote ID (${quoteId}) in your reply so we can track everything easily.\n\nThanks a bunch!`,

    // Technical format
    technicalExpectations: [
      'Unit cost breakdown per item',
      'Lead time and availability per item',
      'Shipping terms and cost',
      'Quality certifications/specs',
      'Payment terms (Net 30/60/90)',
      'Warranty/RMA policy',
      'Technical support availability',
    ],
    technicalNote:
      'Please ensure your quotation includes all technical specifications and compliance documentation if applicable.',
    technicalHeader: 'Expected Quotation Elements:',
  },

  BG: {
    // Email subject line components (Bulgarian)
    subject: {
      quoteRequest: 'Заявка за оферта',
      items: (count) => `Заявка за оферта: ${count} артикула`,
      singleItem: (quantity, itemName) => `Заявка за оферта: ${quantity}x ${itemName}`,
      withId: (baseSubject, quoteId) => `${baseSubject} [${quoteId}]`,
    },

    // Email greeting (Bulgarian)
    greeting: (supplierName) => `Уважаеми ${supplierName || 'Доставчик'},`,

    // Intro text (Bulgarian)
    intro: 'Моля за оферта на следните артикули:',

    // Quote details section (Bulgarian)
    quoteDetails: {
      header: '------- ДЕТАЙЛИ НА ЗАЯВКАТА ЗА ОФЕРТА -------',
      quoteId: 'ID на оферта',
      date: 'Дата на подаване',
      deliveryDate: 'Желана Дата стоката да при нас',
    },

    // Item sections (Bulgarian)
    itemsHeader: '------- ПОРЪЧАНИ АРТИКУЛИ -------',
    itemSingle: '------- ПОРЪЧАН АРТИКУЛ -------',
    itemLabel: (index) => `Артикул ${index + 1}:`,
    itemFields: {
      partName: 'Име на артикула',
      supplierPartNumber: 'Ваш Номер/КОД',
      supplierSku: 'SKU на доставчика',
      internalId: 'SKU/Вътрешен ID',
      quantity: 'Количество',
      description: 'Описание',
      units: 'брой',
    },

    // Delivery and preferences (Bulgarian)
    deliveryLocation: 'Адрес на доставка',
    budgetPreferences: 'Бюджет и предпочитания',
    budgetExpectation: 'Очакван бюджет',
    specialInstructions: 'Специални инструкции и забележки',

    // Requestor information (Bulgarian)
    requestorInfo: '------- ИНФОРМАЦИЯ НА ЗАЯВИТЕЛЯ -------',
    phone: 'Телефон',

    // Professional format closing instructions (Bulgarian)
    closeInstructions: {
      header: 'Бихме искали вашата подробна оферта, включваща:',
      items: [
        'Единична цена и обща цена за всеки артикул',
        'Наличност и време на доставка',
        'Условия на доставка и разход (ако е приложимо)',
        'Условия на плащане',
        'Всички възможни отстъпки при по-голямо количество',
        'Информация за гаранцията',
      ],
    },

    // Closing remarks (Bulgarian)
    closingRemark: (quoteId) =>
      `Молим, изпратете ми вашата оферта при първа възможност. Референцирайте ID на оферта (${quoteId}) в отговора си за лесно проследяване.`,

    thankYou: 'Благодаря ви за вашето незабавно внимание на този запрос.',
    bestRegards: 'С уважение,',
    website: 'www.partpulse.eu',
    generated: 'Оферта генерирана',

    // Casual format (Bulgarian)
    casualIntro: 'Надявам се, че сте добре! Търсим оферта за някои части и се сетихме за вас.',
    casualClosing: (quoteId) =>
      `Можете ли да ни изпратите вашата най-добра оферта? Търсим:\n• Вашите цени за всеки артикул\n• Как бързо можете да доставите\n• Всички възможни отстъпки\n• Вашите условия на плащане\n\nМолим, референцирайте ID на оферта (${quoteId}) в отговора си.\n\nМного благодаря!`,

    // Technical format (Bulgarian)
    technicalExpectations: [
      'Разбивка на разходите за всеки артикул',
      'Време на доставка и наличност за всеки артикул',
      'Условия и разход на доставка',
      'Сертификати и спецификации за качество',
      'Условия на плащане (Net 30/60/90)',
      'Политика за гаранция/RMA',
      'Наличност на техническа поддръжка',
    ],
    technicalNote:
      'Молим, уверете се, че вашата оферта включва всички технически спецификации и документация за съответствие, ако е приложимо.',
    technicalHeader: 'Очакваните елементи на котировката:',
  },
};

/**
 * Get template for specific language
 * @param {string} languageCode - 'EN' or 'BG' (defaults to 'EN')
 * @returns {object} Template strings for selected language
 */
export const getTemplate = (languageCode = 'EN') => {
  return emailTemplates[languageCode] || emailTemplates.EN;
};

/**
 * Generate email subject
 * @param {string} languageCode - 'EN' or 'BG'
 * @param {object} options - { supplierName, itemName, quantity, quoteId, items }
 * @returns {string} Translated subject line
 */
export const generateSubject = (
  languageCode = 'EN',
  { supplierName, itemName, quantity, quoteId, items }
) => {
  const template = getTemplate(languageCode);
  let baseSubject;

  if (Array.isArray(items) && items.length > 0) {
    baseSubject = template.subject.items(items.length);
  } else if (itemName) {
    baseSubject = template.subject.singleItem(quantity || 1, itemName);
  } else {
    baseSubject = template.subject.quoteRequest;
  }

  return quoteId ? template.subject.withId(baseSubject, quoteId) : baseSubject;
};

/**
 * Format items list
 * @param {array} items - Array of items
 * @param {string} languageCode - 'EN' or 'BG'
 * @returns {string} Formatted items section
 */
export const formatItems = (items, languageCode = 'EN') => {
  const template = getTemplate(languageCode);
  let itemsSection = '';

  if (Array.isArray(items) && items.length > 0) {
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
  }

  return itemsSection;
};

/**
 * Format list with bullet points
 * @param {array} items - Array of strings
 * @param {string} languageCode - 'EN' or 'BG'
 * @returns {string} Formatted list
 */
export const formatList = (items, languageCode = 'EN') => {
  return items.map((item) => `  • ${item}`).join('\n');
};

/**
 * Get localized date format
 * @param {Date} date - Date object
 * @param {string} languageCode - 'EN' or 'BG'
 * @returns {string} Formatted date
 */
export const formatDate = (date = new Date(), languageCode = 'EN') => {
  const locale = languageCode === 'BG' ? 'bg-BG' : 'en-US';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default emailTemplates;
