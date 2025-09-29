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
  type: 'income' | 'expense';
}

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
      'category', 'food', 'transport', 'shopping', 'bill', 'entertainment', 'health', 'medical'
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

    // --- Start of New Gemini API Integration ---

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
                text: `You are a helpful and precise financial assistant. Your answers are based *only* on the transaction data provided by the user.

**Your Task:**
1.  **Analyze the User's Question:** Understand what financial information the user is asking for. Pay close attention to dates, date ranges (like "last month" or "in August"), transaction categories, and amounts.
2.  **Filter Transactions:** Based on the user's question, filter the transactions to match their criteria. Be very careful with date filtering. For example, if the user asks about "August," only include transactions from August of any year present in the data.
3.  **Perform Calculations:** Calculate totals, averages, or find specific transactions as needed to answer the question.
4.  **Provide a Clear Answer:** State the answer clearly and concisely. Always mention the time period your answer covers.
5.  **Offer Deeper Insights (Optional):** If you notice a trend, an unusually high expense, or a significant change in spending habits, you can point it out to the user. For example: "You spent ₱5,000 on dining out this month. That's 20% higher than last month."

**Important Rules:**
* **Data is Your World:** Do not use any information outside of the provided transaction list. If you cannot answer the question with the given data, say so.
* **Currency:** All amounts are in Philippine Pesos (₱).
* **Current Date:** Today's date is ${now.toISOString().split('T')[0]}.

**User's Question:** "${question}"

**Transaction Data (JSON):**
${JSON.stringify(transactions)}
`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.5,
          topK: 1,
          topP: 1,
          maxOutputTokens: 300,
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