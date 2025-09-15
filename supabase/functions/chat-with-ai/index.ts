import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, transactions, currentDate } = await req.json();
    
    if (!question || !Array.isArray(transactions)) {
      return new Response(
        JSON.stringify({ error: 'Missing question or transactions data' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if question is finance-related
    const lowerQuestion = question.toLowerCase();
    const financeKeywords = [
      'spend', 'spent', 'expense', 'income', 'money', 'budget', 'cost', 'paid', 'earn', 'earned',
      'transaction', 'purchase', 'buy', 'bought', 'sale', 'financial', 'finance', 'cash', 'amount',
      'category', 'food', 'transport', 'shopping', 'bill', 'entertainment', 'health', 'medical'
    ];

    const isFinanceRelated = financeKeywords.some(keyword => lowerQuestion.includes(keyword));
    
    if (!isFinanceRelated) {
      return new Response(
        JSON.stringify({ 
          answer: "I'm a financial assistant focused on helping you understand your spending and income patterns. Please ask questions related to your transactions, expenses, income, or financial habits."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (transactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          answer: "I don't have any transaction data to analyze yet. Please upload your CSV file or add some transactions first."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter transactions based on time-related queries (supports explicit ranges)
    const now = new Date(currentDate || new Date().toISOString());

    // Helpers to parse dates from natural language
    const monthMap: Record<string, number> = {
      january: 0, jan: 0,
      february: 1, feb: 1,
      march: 2, mar: 2,
      april: 3, apr: 3,
      may: 4,
      june: 5, jun: 5,
      july: 6, jul: 6,
      august: 7, aug: 7,
      september: 8, sep: 8, sept: 8,
      october: 9, oct: 9,
      november: 10, nov: 10,
      december: 11, dec: 11,
    };

    const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const tryParseExplicitDate = (token: string): Date | null => {
      const s = token.trim().replace(/,/g, '');
      // ISO YYYY-MM-DD
      const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (iso) {
        const y = parseInt(iso[1]);
        const m = parseInt(iso[2]) - 1;
        const d = parseInt(iso[3]);
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) return toDateOnly(dt);
      }
      // MM/DD[/YY or /YYYY]
      const us = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
      if (us) {
        const m = parseInt(us[1]) - 1;
        const d = parseInt(us[2]);
        let y = now.getFullYear();
        if (us[3]) {
          const yy = parseInt(us[3]);
          y = yy < 100 ? 2000 + yy : yy;
        }
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) return toDateOnly(dt);
      }
      // MonthName Day [Year]
      const text = s.match(/^(\w+)\s+(\d{1,2})(?:\s+(\d{4}))?$/i);
      if (text) {
        const monthIdx = monthMap[text[1].toLowerCase()];
        if (monthIdx !== undefined) {
          const d = parseInt(text[2]);
          const y = text[3] ? parseInt(text[3]) : now.getFullYear();
          const dt = new Date(y, monthIdx, d);
          if (!isNaN(dt.getTime())) return toDateOnly(dt);
        }
      }
      return null;
    };

    const detectExplicitRange = (q: string): { start: Date; end: Date } | null => {
      // Case: Month Day - Day [Year]
      const mdRange = q.match(/(january|february|march|april|may|june|july|august|september|sept|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\s*(?:to|\-|through|thru)\s*(\d{1,2})(?:\s*(\d{4}))?/i);
      if (mdRange) {
        const m = monthMap[mdRange[1].toLowerCase()];
        const d1 = parseInt(mdRange[2]);
        const d2 = parseInt(mdRange[3]);
        const y = mdRange[4] ? parseInt(mdRange[4]) : now.getFullYear();
        const start = toDateOnly(new Date(y, m, d1));
        const end = toDateOnly(new Date(y, m, d2));
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
      }
      // Case: from X to Y / between X and Y
      const between = q.match(/(?:from|between)\s+([^\s].*?)\s*(?:to|and|\-)\s*([^\s].*?)(?:\b|\?)/i);
      if (between) {
        const left = tryParseExplicitDate(between[1]);
        let right = tryParseExplicitDate(between[2]);
        if (left && !right) {
          // If right omits month/year, inherit from left
          const token = between[2].trim();
          const dayOnly = token.match(/^(\d{1,2})$/);
          if (dayOnly) {
            right = toDateOnly(new Date(left.getFullYear(), left.getMonth(), parseInt(dayOnly[1])));
          }
        }
        if (left && right) {
          const start = left <= right ? left : right;
          const end = left <= right ? right : left;
          return { start, end };
        }
      }
      // Case: YYYY-MM-DD to YYYY-MM-DD
      const isoRange = q.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|\-)\s*(\d{4}-\d{2}-\d{2})/);
      if (isoRange) {
        const left = tryParseExplicitDate(isoRange[1]);
        const right = tryParseExplicitDate(isoRange[2]);
        if (left && right) {
          return { start: left <= right ? left : right, end: left <= right ? right : left };
        }
      }
      // Case: on <date>
      const onDate = q.match(/\bon\s+([^\s].*?)(?:\b|\?|$)/i);
      if (onDate) {
        const d = tryParseExplicitDate(onDate[1]);
        if (d) return { start: d, end: d };
      }
      return null;
    };

    let filteredTransactions = transactions;
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    const explicitRange = detectExplicitRange(lowerQuestion);
    if (explicitRange) {
      rangeStart = explicitRange.start;
      rangeEnd = explicitRange.end;
      filteredTransactions = transactions.filter((t: Transaction) => {
        const d = toDateOnly(new Date(t.date));
        return d >= explicitRange.start && d <= explicitRange.end;
      });
    } else {
      // Keyword-based relative ranges
      if (lowerQuestion.includes('last week') || lowerQuestion.includes('past week')) {
        rangeStart = toDateOnly(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        rangeEnd = toDateOnly(now);
        filteredTransactions = transactions.filter((t: Transaction) => toDateOnly(new Date(t.date)) >= rangeStart!);
      } else if (lowerQuestion.includes('last month') || lowerQuestion.includes('past month') || lowerQuestion.includes('this month')) {
        rangeStart = toDateOnly(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        rangeEnd = toDateOnly(now);
        filteredTransactions = transactions.filter((t: Transaction) => toDateOnly(new Date(t.date)) >= rangeStart!);
      } else if (lowerQuestion.includes('last year') || lowerQuestion.includes('past year') || lowerQuestion.includes('this year')) {
        rangeStart = toDateOnly(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
        rangeEnd = toDateOnly(now);
        filteredTransactions = transactions.filter((t: Transaction) => toDateOnly(new Date(t.date)) >= rangeStart!);
      } else if (lowerQuestion.includes('today')) {
        rangeStart = toDateOnly(now);
        rangeEnd = toDateOnly(now);
        const today = now.toISOString().split('T')[0];
        filteredTransactions = transactions.filter((t: Transaction) => t.date === today);
      } else if (lowerQuestion.includes('yesterday')) {
        const y = toDateOnly(new Date(now.getTime() - 24 * 60 * 60 * 1000));
        rangeStart = y; rangeEnd = y;
        const yStr = new Date(y).toISOString().split('T')[0];
        filteredTransactions = transactions.filter((t: Transaction) => t.date === yStr);
      }
    }

    // Build financial context using filtered transactions
    const totalIncome = filteredTransactions
      .filter((t: Transaction) => t.type === 'income')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    
    const totalExpenses = filteredTransactions
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    
    const categoryTotals = filteredTransactions
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((acc: Record<string, number>, t: Transaction) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const topCategories = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3);

    const timeframe = (rangeStart && rangeEnd)
      ? `from ${rangeStart.toISOString().split('T')[0]} to ${rangeEnd.toISOString().split('T')[0]}`
      : lowerQuestion.includes('last week') || lowerQuestion.includes('past week') ? 'last week' :
        lowerQuestion.includes('last month') || lowerQuestion.includes('past month') || lowerQuestion.includes('this month') ? 'last month' :
        lowerQuestion.includes('last year') || lowerQuestion.includes('past year') || lowerQuestion.includes('this year') ? 'last year' :
        lowerQuestion.includes('today') ? 'today' :
        lowerQuestion.includes('yesterday') ? 'yesterday' : 'all time';

    const context = `
Financial Summary${timeframe !== 'all time' ? ` for ${timeframe}` : ''}:
- Total Income: ₱${totalIncome.toLocaleString()}
- Total Expenses: ₱${totalExpenses.toLocaleString()}
- Net Balance: ₱${(totalIncome - totalExpenses).toLocaleString()}
- Top Spending Categories: ${topCategories.map(([cat, amt]) => `${cat} (₱${(amt as number).toLocaleString()})`).join(', ')}
- Transactions Analyzed: ${filteredTransactions.length} out of ${transactions.length} total
- Current Date: ${now.toISOString().split('T')[0]}
`;

    // Deterministic quick answer for "how much did I spend" queries
    const isSumQuestion = /(how much|total).*(spend|spent|expenses?)/.test(lowerQuestion);

    if (isSumQuestion) {
      // Optional category focus detected from question
      const catMap: Record<string, string> = {
        transport: 'Transportation', transportation: 'Transportation', car: 'Transportation', gas: 'Transportation', fuel: 'Transportation', uber: 'Transportation', taxi: 'Transportation', bus: 'Transportation', train: 'Transportation', parking: 'Transportation', toll: 'Transportation', maintenance: 'Transportation',
        food: 'Food & Dining', dining: 'Food & Dining', restaurant: 'Food & Dining', grocery: 'Food & Dining', groceries: 'Food & Dining', cafe: 'Food & Dining', coffee: 'Food & Dining',
        shopping: 'Shopping', retail: 'Shopping', mall: 'Shopping', amazon: 'Shopping',
        bill: 'Bills & Utilities', bills: 'Bills & Utilities', utilities: 'Bills & Utilities', internet: 'Bills & Utilities', electricity: 'Bills & Utilities', rent: 'Bills & Utilities',
        entertainment: 'Entertainment', movie: 'Entertainment', netflix: 'Entertainment',
        health: 'Health & Medical', medical: 'Health & Medical', pharmacy: 'Health & Medical',
      };
      let focusCategory: string | null = null;
      for (const k in catMap) {
        if (lowerQuestion.includes(k)) { focusCategory = catMap[k]; break; }
      }

      const transportationSyns = ['transport', 'transportation', 'car', 'gas', 'fuel', 'uber', 'taxi', 'bus', 'train', 'parking', 'toll', 'maintenance'];

      const withinRange = filteredTransactions.filter((t: Transaction) => t.type === 'expense');
      const categoryFiltered = focusCategory ? withinRange.filter((t) => {
        const lc = t.category.toLowerCase();
        if (focusCategory === 'Transportation') {
          return transportationSyns.some(s => lc.includes(s));
        }
        return lc.includes(focusCategory.toLowerCase());
      }) : withinRange;

      const sum = categoryFiltered.reduce((acc, t) => acc + t.amount, 0);
      const label = focusCategory ? focusCategory.toLowerCase() : 'expenses';
      const rangeText = (rangeStart && rangeEnd) ? `from ${rangeStart.toISOString().split('T')[0]} to ${rangeEnd.toISOString().split('T')[0]}` : timeframe !== 'all time' ? `for ${timeframe}` : 'for all time';
      const details = `based on ${categoryFiltered.length} transaction${categoryFiltered.length !== 1 ? 's' : ''}`;

      return new Response(
        JSON.stringify({ answer: `You spent ₱${sum.toLocaleString()} on ${label} ${rangeText} (${details}).` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a financial advisor AI assistant. Analyze the user's transaction data and provide helpful insights. Use Philippine Peso (₱) currency format. Keep responses concise and specific.

${context}

Question: ${question}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 200,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!answer) {
      console.error('No answer received from Gemini API');
      return new Response(
        JSON.stringify({ error: 'No response generated' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ answer: answer.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});