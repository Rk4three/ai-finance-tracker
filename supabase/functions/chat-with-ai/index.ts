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

    const now = new Date(currentDate || new Date().toISOString());

    // Build financial context using all transactions
    const totalIncome = transactions
      .filter((t: Transaction) => t.type === 'income')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    
    const categoryTotals = transactions
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((acc: Record<string, number>, t: Transaction) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const topCategories = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3);

    const context = `
Financial Summary (Overall):
- Total Income: ₱${totalIncome.toLocaleString()}
- Total Expenses: ₱${totalExpenses.toLocaleString()}
- Net Balance: ₱${(totalIncome - totalExpenses).toLocaleString()}
- Top Spending Categories: ${topCategories.map(([cat, amt]) => `${cat} (₱${(amt as number).toLocaleString()})`).join(', ')}
- Total Transactions: ${transactions.length}
- Current Date: ${now.toISOString().split('T')[0]}

Please answer the user's question based on the provided transactions. The user may ask about specific time ranges, categories, or other details. Analyze the full transaction list to provide the most accurate answer, even if the question implies a filter that is not explicitly provided.
`;

    // @ts-ignore: Deno global is available at runtime in Deno Deploy/Supabase Edge Functions
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

Question: ${question}

Transaction Data:
${JSON.stringify(transactions, null, 2)}
`
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