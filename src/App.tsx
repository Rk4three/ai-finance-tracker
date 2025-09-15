import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  PiggyBank, 
  Search,
  Filter,
  Plus,
  Moon,
  Sun,
  ChevronRight,
  Wallet,
  ShoppingCart,
  Car,
  Home,
  Coffee,
  Brain,
  Download
} from 'lucide-react';
import FileUpload from './components/FileUpload';
import CashFlowChart from './components/CashFlowChart';
import StatCard from './components/StatCard';

import AddTransactionModal from './components/AddTransactionModal';
import FilterModal from './components/FilterModal';
import TransactionDetailModal from './components/TransactionDetailModal';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './components/ui/pagination';
import { aiService } from './services/aiService';

interface Transaction {
  id: number;
  category: string;
  amount: number;
  date: string;
  description: string;
  type: "income" | "expense";
  icon?: React.ComponentType<{ className?: string }>;
}

const App = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [currentPage, setCurrentPage] = useState(1);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const itemsPerPage = 6;
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    categories: [] as string[],
    amountRange: { min: '', max: '' },
    type: 'all' as 'all' | 'income' | 'expense'
  });

  // Expanded dummy data
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 1, category: "Food & Dining", amount: 450, date: "2025-09-05", description: "Starbucks Coffee", type: "expense", icon: Coffee },
    { id: 2, category: "Transportation", amount: 120, date: "2025-09-06", description: "Uber Ride", type: "expense", icon: Car },
    { id: 3, category: "Shopping", amount: 320, date: "2025-09-04", description: "Amazon Purchase", type: "expense", icon: ShoppingCart },
    { id: 4, category: "Bills & Utilities", amount: 85, date: "2025-09-03", description: "Internet Bill", type: "expense", icon: Home },
    { id: 5, category: "Income", amount: 5000, date: "2025-09-01", description: "Monthly Salary", type: "income", icon: Coins },
    { id: 6, category: "Food & Dining", amount: 35.75, date: "2025-09-07", description: "Dinner at Restaurant", type: "expense", icon: Coffee },
    { id: 7, category: "Transportation", amount: 65, date: "2025-09-08", description: "Gas Station Fill Up", type: "expense", icon: Car },
    { id: 8, category: "Entertainment", amount: 15.99, date: "2025-09-09", description: "Netflix Subscription", type: "expense", icon: Coffee },
    { id: 9, category: "Income", amount: 800, date: "2025-09-07", description: "Freelance Project Payment", type: "income", icon: Coins },
    { id: 10, category: "Health & Medical", amount: 22.50, date: "2025-09-08", description: "Pharmacy Medicine", type: "expense", icon: Home },
    { id: 11, category: "Shopping", amount: 89.99, date: "2025-09-06", description: "Mall Purchase - Uniqlo", type: "expense", icon: ShoppingCart },
    { id: 12, category: "Bills & Utilities", amount: 125.40, date: "2025-09-05", description: "Electricity Bill", type: "expense", icon: Home },
    { id: 13, category: "Food & Dining", amount: 285.75, date: "2025-09-02", description: "Grocery Shopping", type: "expense", icon: Coffee },
    { id: 14, category: "Entertainment", amount: 24.00, date: "2025-09-07", description: "Movie Tickets", type: "expense", icon: Coffee },
    { id: 15, category: "Transportation", amount: 350.00, date: "2025-09-11", description: "Car Maintenance", type: "expense", icon: Car },
  ]);

  const handleTransactionsLoaded = (loadedTransactions: Transaction[]) => {
    const transactionsWithIcons = loadedTransactions.map(transaction => ({
      ...transaction,
      icon: getCategoryIcon(transaction.category)
    }));
    setTransactions(transactionsWithIcons);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  };

  const handleDeleteTransaction = (transactionId: number) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
  };

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;
    
    setIsAiLoading(true);
    try {
      const response = await aiService.askQuestion(aiQuery);
      setAiResponse(response.answer);
    } catch (error) {
      setAiResponse('Sorry, I encountered an error while processing your question. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };


  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      // Update existing transaction
      setTransactions(prev => prev.map(t => 
        t.id === editingTransaction.id 
          ? { ...newTransaction, id: editingTransaction.id, icon: getCategoryIcon(newTransaction.category) }
          : t
      ));
      setEditingTransaction(null);
    } else {
      // Add new transaction
      const transaction: Transaction = {
        ...newTransaction,
        id: Math.max(0, ...transactions.map(t => t.id)) + 1,
        icon: getCategoryIcon(newTransaction.category)
      };
      setTransactions(prev => [...prev, transaction]);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Description', 'Amount', 'Category', 'Type'],
      ...filteredTransactions.map(t => [
        t.date,
        t.description,
        t.amount.toString(),
        t.category,
        t.type
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('food') || categoryLower.includes('dining')) return Coffee;
    if (categoryLower.includes('transport') || categoryLower.includes('car') || categoryLower.includes('gas')) return Car;
    if (categoryLower.includes('shopping') || categoryLower.includes('retail')) return ShoppingCart;
    if (categoryLower.includes('bill') || categoryLower.includes('utilities') || categoryLower.includes('rent')) return Home;
    if (categoryLower.includes('salary') || categoryLower.includes('income')) return Coins;
    return Wallet;
  };

  // Filter transactions based on period and filters
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Period filtering
    const now = new Date();
    let startDate: Date;
    
    switch (selectedPeriod) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    filtered = filtered.filter(t => new Date(t.date) >= startDate);

    // Apply additional filters
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter(t => filters.categories.includes(t.category));
    }

    if (filters.dateRange.start) {
      filtered = filtered.filter(t => t.date >= filters.dateRange.start);
    }

    if (filters.dateRange.end) {
      filtered = filtered.filter(t => t.date <= filters.dateRange.end);
    }

    if (filters.amountRange.min) {
      filtered = filtered.filter(t => t.amount >= parseFloat(filters.amountRange.min));
    }

    if (filters.amountRange.max) {
      filtered = filtered.filter(t => t.amount <= parseFloat(filters.amountRange.max));
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedPeriod, filters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 if current page exceeds total pages after filtering
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Update AI service when transactions change
  React.useEffect(() => {
    aiService.setTransactions(transactions);
  }, [transactions]);

  // Calculate statistics from all transactions
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  const savings = Math.max(0, balance * 0.2); // 20% savings rate

  // Expense categories for pie chart (from all transactions)
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.entries(expensesByCategory).map(([name, value], index) => ({
    name,
    value,
    color: ['#8B5CF6', '#EF4444', '#F59E0B', '#10B981', '#3B82F6'][index % 5]
  }));

  // Transaction Row Component
  const TransactionRow: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    const IconComponent = transaction.icon || Wallet;
    return (
      <div 
        className="bg-card border border-border rounded-xl p-4 transition-all duration-200 cursor-pointer group hover:shadow-card"
        onClick={() => {
          setSelectedTransaction(transaction);
          setShowTransactionDetail(true);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-muted p-2 rounded-lg group-hover:scale-110 transition-transform">
              <IconComponent className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {transaction.description}
              </p>
              <p className="text-sm text-muted-foreground">
                {transaction.category} • {transaction.date}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-bold ${
              transaction.type === 'income' ? 'text-income' : 'text-expense'
            }`}>
              {transaction.type === 'income' ? '+' : '-'}₱{transaction.amount.toLocaleString()}
            </p>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode ? 'dark bg-background' : 'bg-background'
    }`}>
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-lg border-b border-border sticky top-0 z-50 shadow-card">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-primary p-2 rounded-xl shadow-glow">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Smart Finance
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI-Powered Personal Finance Dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
                {['7d', '30d', '90d', '1y'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      selectedPeriod === period
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-muted text-muted-foreground hover:scale-105 transition-transform"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 lg:px-12 py-8 space-y-8">
        {/* File Upload Section */}
        <FileUpload onTransactionsLoaded={handleTransactionsLoaded} darkMode={darkMode} />

        {/* AI Query Box */}
        <div className="bg-gradient-primary rounded-2xl p-6 border border-primary/20 mb-8 relative overflow-hidden shadow-glow">
          <div className="absolute inset-0 bg-gradient-subtle backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-white/20 p-2 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">AI Financial Assistant</h3>
            </div>
            <div className="relative mb-4">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask me anything about your finances... 'How much did I spend on food this month?'"
                className="w-full p-4 pr-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleAiQuery()}
                disabled={isAiLoading}
              />
              <button 
                onClick={handleAiQuery}
                disabled={isAiLoading || !aiQuery.trim()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {isAiLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
            {aiResponse && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white">
                <p>{aiResponse}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Current Balance"
            value={balance}
            change="+12.5%"
            changeType="positive"
            icon={Coins}
            variant="balance"
            trend={[{value: 1000}, {value: 1100}, {value: 1050}, {value: 1200}, {value: balance}]}
          />
          <StatCard
            title="Total Income"
            value={totalIncome}
            change="+8.2%"
            changeType="positive"
            icon={TrendingUp}
            variant="income"
            trend={[{value: 3200}, {value: 3300}, {value: 3400}, {value: 3450}, {value: totalIncome}]}
          />
          <StatCard
            title="Total Expenses"
            value={totalExpenses}
            change="-3.1%"
            changeType="positive"
            icon={TrendingDown}
            variant="expense"
            trend={[{value: 2400}, {value: 2350}, {value: 2300}, {value: 2280}, {value: totalExpenses}]}
          />
          <StatCard
            title="Estimated Savings"
            value={savings}
            change="+15.3%"
            changeType="positive"
            icon={PiggyBank}
            variant="default"
            trend={[{value: 750}, {value: 780}, {value: 820}, {value: 850}, {value: savings}]}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Cash Flow Chart */}
        <div className="xl:col-span-2">
          <CashFlowChart transactions={transactions} darkMode={darkMode} />
        </div>

          {/* Expense Categories Pie Chart */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h2 className="text-xl font-bold mb-6 text-foreground">
              Expense Categories
            </h2>
            {chartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? 'hsl(var(--card))' : 'hsl(var(--card))',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-elevated)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {chartData.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm text-muted-foreground">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        ₱{item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>No expense data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              Recent Transactions
            </h2>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowFilterModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:scale-105 transition-transform"
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filter</span>
                {(filters.categories.length > 0 || filters.type !== 'all' || filters.dateRange.start || filters.amountRange.min) && (
                  <span className="w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:scale-105 transition-transform shadow-glow"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Transaction</span>
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-success text-success-foreground rounded-lg hover:scale-105 transition-transform"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Export</span>
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions found. Try adjusting your filters or upload a CSV file!</p>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        {/* Modals */}
        <AddTransactionModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingTransaction(null);
          }}
          onAdd={handleAddTransaction}
          editingTransaction={editingTransaction}
        />
        
        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={setFilters}
          currentFilters={filters}
        />
      </main>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={showTransactionDetail}
        onClose={() => {
          setShowTransactionDetail(false);
          setSelectedTransaction(null);
        }}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />
    </div>
  );
};

export default App;