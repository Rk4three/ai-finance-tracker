interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense' | 'savings';
}

interface AIResponse {
  answer: string;
  error?: string;
}

// AI service that uses secure Supabase edge function
class AIService {
  private transactions: Transaction[] = [];

  setTransactions(transactions: Transaction[]) {
    this.transactions = transactions;
  }

  async askQuestion(question: string): Promise<AIResponse> {
    try {
      // Use Supabase edge function to handle AI requests securely
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: { 
          question, 
          transactions: this.transactions,
          currentDate: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Error calling AI function:', error);
        // Fallback to local analysis
        return this.getLocalAnalysis(question.toLowerCase());
      }

      return { answer: data.answer };
    } catch (error) {
      console.error('AI service error:', error);
      // Fallback to local analysis
      return this.getLocalAnalysis(question.toLowerCase());
    }
  }

  private buildFinancialContext(): string {
      const totalIncome = this.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = this.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalSavings = this.transactions
        .filter(t => t.type === 'savings')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const categoryTotals = this.transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>);

      const topCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);

      return `
Financial Summary:
- Total Income: ₱${totalIncome.toLocaleString()}
- Total Expenses: ₱${totalExpenses.toLocaleString()}
- Total Savings: ₱${totalSavings.toLocaleString()}
- Net Balance: ₱${(totalIncome - totalExpenses).toLocaleString()}
- Top Spending Categories: ${topCategories.map(([cat, amt]) => `${cat} (₱${amt.toLocaleString()})`).join(', ')}
- Total Transactions: ${this.transactions.length}
`;
  }

  private getLocalAnalysis(question: string): AIResponse {
    const expenses = this.transactions.filter(t => t.type === 'expense');
    const income = this.transactions.filter(t => t.type === 'income');
    const savings = this.transactions.filter(t => t.type === 'savings');
    
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalSavings = savings.reduce((sum, t) => sum + t.amount, 0);

    if (question.includes('total') || question.includes('how much')) {
      if (question.includes('income')) {
        return { answer: `Your total income is ₱${totalIncome.toLocaleString()}` };
      } else if (question.includes('expense') || question.includes('spend')) {
        return { answer: `Your total expenses are ₱${totalExpenses.toLocaleString()}` };
      } else if (question.includes('saving')) {
        return { answer: `Your total savings are ₱${totalSavings.toLocaleString()}` };
      } else {
        return { 
          answer: `Your total income is ₱${totalIncome.toLocaleString()}, total expenses are ₱${totalExpenses.toLocaleString()}, and total savings are ₱${totalSavings.toLocaleString()}. Your net balance is ₱${(totalIncome - totalExpenses).toLocaleString()}`
        };
      }
    } else if (question.includes('most') || question.includes('highest') || question.includes('largest')) {
      if (expenses.length === 0) {
        return { answer: "You don't have any expense transactions yet." };
      }
      const mostExpensive = expenses.reduce((max, t) => t.amount > max.amount ? t : max, expenses[0]);
      return { 
        answer: `Your most expensive transaction was ₱${mostExpensive.amount.toLocaleString()} for "${mostExpensive.description}" in the ${mostExpensive.category} category on ${new Date(mostExpensive.date).toLocaleDateString()}`
      };
    } else if (question.includes('category') || question.includes('categories')) {
      const categoryTotals = expenses.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

      const sortedCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);

      if (sortedCategories.length === 0) {
        return { answer: "You don't have any expense categories yet." };
      }

      const categoryList = sortedCategories
        .map(([category, amount]) => `${category}: ₱${amount.toLocaleString()}`)
        .join(', ');

      return { 
        answer: `Your top spending categories are: ${categoryList}. Your highest spending category is ${sortedCategories[0][0]} with ₱${sortedCategories[0][1].toLocaleString()}`
      };
    } else if (question.includes('average') || question.includes('mean')) {
      if (expenses.length === 0) {
        return { answer: "You don't have any expense transactions to calculate an average." };
      }
      const average = expenses.reduce((sum, t) => sum + t.amount, 0) / expenses.length;
      return { 
        answer: `Your average expense per transaction is ₱${average.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      };
    } else {
      return { 
        answer: `Here's a summary of your finances: You have ${this.transactions.length} total transactions (${income.length} income, ${expenses.length} expenses, ${savings.length} savings). Total income: ₱${totalIncome.toLocaleString()}, Total expenses: ₱${totalExpenses.toLocaleString()}, Total savings: ₱${totalSavings.toLocaleString()}, Net balance: ₱${(totalIncome - totalExpenses).toLocaleString()}`
      };
    }
  }
}

export const aiService = new AIService();