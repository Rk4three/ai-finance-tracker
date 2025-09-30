import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// new cors headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// transaction interface
interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense' | 'savings';
}

// --- NEW FUNCTION: Pre-filter transactions ---
const getRelevantTransactions = (question: string, transactions: Transaction[], currentDate: Date): Transaction[] => {
  const lowerQuestion = question.toLowerCase();
  let lookbackDays = 90; // Default lookback window of 90 days

  // Check for keywords and adjust lookback window
  if (lowerQuestion.includes('last month')) {
    lookbackDays = 60;
  } else if (lowerQuestion.includes('this month')) {
    lookbackDays = 30;
  } else if (lowerQuestion.includes('last week')) {
    lookbackDays = 14;
  } else if (lowerQuestion.includes('this week')) {
    lookbackDays = 7;
  } else if (lowerQuestion.includes('yesterday')) {
    lookbackDays = 2;
  } else if (lowerQuestion.includes('today')) {
    lookbackDays = 1;
  } else if (lowerQuestion.includes('year')) {
    lookbackDays = 365;
  }

  const startDate = new Date(currentDate);
  startDate.setDate(startDate.getDate() - lookbackDays);

  return transactions.filter(t => new Date(t.date) >= startDate);
};
// --- END OF NEW FUNCTION ---

serve(async (req: Request) => {
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
      'category', 'food', 'transport', 'shopping', 'bill', 'entertainment', 'health', 'medical', 'savings'
    ];

    const isFinanceRelated = financeKeywords.some(keyword => lowerQuestion.includes(keyword));
    
    if (!isFinanceRelated) {
      return new Response(
        JSON.stringify({ 
          answer: "I can only answer questions about your finances. Please ask something related to your transactions, spending, or income."
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

    const now = new Date(currentDate || new Date().toISOString());

    // --- MODIFIED: Use the new function to filter transactions ---
    const relevantTransactions = getRelevantTransactions(question, transactions, now);

    // --- Start of Groq API Integration ---

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a helpful and precise financial assistant. Your answers are based *only* on the transaction data provided by the user.

**Your Task:**
1.  **Analyze the User's Question:** Understand what financial information the user is asking for.
2.  **Filter and Calculate:** Based on the user's question, filter the transactions and perform the necessary calculations.
3.  **Provide a Clear and Concise Answer:** **Only provide the final answer to the user's question.** Do not show your work, do not list the transactions you filtered, and do not explain your reasoning. Be direct and to the point. For example, if the user asks "How much did I spend on food last week?", a good answer would be "You spent ₱XXXX on food last week."

**Important Rules:**
* **Data is Your World:** Do not use any information outside of the provided transaction list.
* **Currency:** All amounts are in Philippine Pesos (₱).
* **Current Date:** Today's date is ${now.toISOString().split('T')[0]}.`
          },
          {
            role: "user",
            content: `**User's Question:** "${question}"

**Transaction Data (JSON):**
${JSON.stringify(relevantTransactions)}`
          }
        ],
        model: "llama-3.1-8b-instant", // Or any other model you prefer from Groq
        temperature: 0.5,
        max_tokens: 8192,
        top_p: 1,
        stop: null,
        stream: false
      })
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;
    
    if (!answer) {
      console.error('No answer received from Groq API');
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

  } catch (error: any) {
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