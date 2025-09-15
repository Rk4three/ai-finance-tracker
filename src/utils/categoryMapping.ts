// Category mapping and detection utilities
export const categoryMappings: Record<string, string> = {
  // Food & Dining
  'food': 'Food & Dining',
  'dining': 'Food & Dining',
  'restaurant': 'Food & Dining',
  'grocery': 'Food & Dining',
  'groceries': 'Food & Dining',
  'supermarket': 'Food & Dining',
  'cafe': 'Food & Dining',
  'coffee': 'Food & Dining',
  'lunch': 'Food & Dining',
  'dinner': 'Food & Dining',
  'breakfast': 'Food & Dining',
  'snack': 'Food & Dining',
  'takeout': 'Food & Dining',
  'delivery': 'Food & Dining',

  // Shopping
  'shopping': 'Shopping',
  'mall': 'Shopping',
  'retail': 'Shopping',
  'store': 'Shopping',
  'purchase': 'Shopping',
  'buy': 'Shopping',
  'amazon': 'Shopping',
  'online': 'Shopping',
  'clothes': 'Shopping',
  'clothing': 'Shopping',
  'shoes': 'Shopping',
  'electronics': 'Shopping',

  // Transportation
  'transport': 'Transportation',
  'transportation': 'Transportation',
  'car': 'Transportation',
  'gas': 'Transportation',
  'fuel': 'Transportation',
  'uber': 'Transportation',
  'taxi': 'Transportation',
  'bus': 'Transportation',
  'train': 'Transportation',
  'parking': 'Transportation',
  'toll': 'Transportation',
  'maintenance': 'Transportation',

  // Bills & Utilities
  'bill': 'Bills & Utilities',
  'bills': 'Bills & Utilities',
  'utility': 'Bills & Utilities',
  'utilities': 'Bills & Utilities',
  'electric': 'Bills & Utilities',
  'electricity': 'Bills & Utilities',
  'water': 'Bills & Utilities',
  'internet': 'Bills & Utilities',
  'phone': 'Bills & Utilities',
  'mobile': 'Bills & Utilities',
  'rent': 'Bills & Utilities',
  'mortgage': 'Bills & Utilities',
  'insurance': 'Bills & Utilities',

  // Entertainment
  'entertainment': 'Entertainment',
  'movie': 'Entertainment',
  'cinema': 'Entertainment',
  'game': 'Entertainment',
  'gaming': 'Entertainment',
  'netflix': 'Entertainment',
  'spotify': 'Entertainment',
  'subscription': 'Entertainment',
  'hobby': 'Entertainment',

  // Health & Medical
  'health': 'Health & Medical',
  'medical': 'Health & Medical',
  'doctor': 'Health & Medical',
  'hospital': 'Health & Medical',
  'pharmacy': 'Health & Medical',
  'medicine': 'Health & Medical',
  'dental': 'Health & Medical',
  'clinic': 'Health & Medical',

  // Income
  'salary': 'Income',
  'wage': 'Income',
  'income': 'Income',
  'pay': 'Income',
  'paycheck': 'Income',
  'bonus': 'Income',
  'freelance': 'Income',
  'refund': 'Income',
};

export const detectCategory = (description: string, category?: string): string => {
  // If category is provided and matches our mappings, use it
  if (category) {
    const categoryLower = category.toLowerCase().trim();
    if (categoryMappings[categoryLower]) {
      return categoryMappings[categoryLower];
    }
  }

  // Try to detect from description
  const descriptionLower = description.toLowerCase().trim();
  
  // Check each keyword in the description
  for (const [keyword, mappedCategory] of Object.entries(categoryMappings)) {
    if (descriptionLower.includes(keyword)) {
      return mappedCategory;
    }
  }

  // If no match found, return provided category or default
  return category || 'Other';
};

export const parseDate = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  const cleaned = dateStr.toString().trim();
  
  // Try different date formats
  const formats = [
    // ISO format (YYYY-MM-DD)
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // US format (MM/DD/YYYY)
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // European format (DD/MM/YYYY)
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // With text month (e.g., "December 15, 2024" or "15 Dec 2024")
  ];

  // Handle text months
  const monthNames = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09', 'sept': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
  };

  // Try to parse text dates
  const textDateRegex = /(\w+)\s+(\d{1,2}),?\s+(\d{4})|(\d{1,2})\s+(\w+)\s+(\d{4})/i;
  const textMatch = cleaned.match(textDateRegex);
  
  if (textMatch) {
    let month, day, year;
    
    if (textMatch[1]) {
      // Format: "December 15, 2024"
      const monthName = textMatch[1].toLowerCase();
      month = monthNames[monthName as keyof typeof monthNames];
      day = textMatch[2].padStart(2, '0');
      year = textMatch[3];
    } else {
      // Format: "15 Dec 2024"
      day = textMatch[4].padStart(2, '0');
      const monthName = textMatch[5].toLowerCase();
      month = monthNames[monthName as keyof typeof monthNames];
      year = textMatch[6];
    }
    
    if (month && day && year) {
      return `${year}-${month}-${day}`;
    }
  }

  // Try standard date parsing
  try {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    // Fallback to current date
    return new Date().toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
};