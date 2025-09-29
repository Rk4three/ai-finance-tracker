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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from './components/ui/pagination';
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

const COLORS = [
  '#8B5CF6', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#6366F1', '#F97316', '#22C55E', '#0EA5E9', '#D946EF', '#84CC16'
];

const generateChartColors = (count: number) => {
  if (count <= COLORS.length) {
    return COLORS.slice(0, count);
  }
  const colors: string[] = [...COLORS];
  for (let i = COLORS.length; i < count; i++) {
    const hue = (i * 37) % 360;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
};

const App = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const itemsPerPage = 10;
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
    { id: 5, category: "Salary", amount: 5000, date: "2025-09-01", description: "Monthly Salary", type: "income", icon: Coins },
    { id: 6, category: "Food & Dining", amount: 35.75, date: "2025-09-07", description: "Dinner at Restaurant", type: "expense", icon: Coffee },
    { id: 7, category: "Transportation", amount: 65, date: "2025-09-08", description: "Gas Station Fill Up", type: "expense", icon: Car },
    { id: 8, category: "Entertainment", amount: 15.99, date: "2025-09-09", description: "Netflix Subscription", type: "expense", icon: Coffee },
    { id: 9, category: "Freelance", amount: 800, date: "2025-09-07", description: "Freelance Project Payment", type: "income", icon: Coins },
    { id: 10, category: "Health & Medical", amount: 22.50, date: "2025-09-08", description: "Pharmacy Medicine", type: "expense", icon: Home },
    { id: 11, category: "Shopping", amount: 89.99, date: "2025-09-06", description: "Mall Purchase - Uniqlo", type: "expense", icon: ShoppingCart },
    { id: 12, category: "Bills & Utilities", amount: 125.40, date: "2025-09-05", description: "Electricity Bill", type: "expense", icon: Home },
    { id: 13, category: "Food & Dining", amount: 285.75, date: "2025-09-02", description: "Grocery Shopping", type: "expense", icon: Coffee },
    { id: 14, category: "Entertainment", amount: 24.00, date: "2025-09-07", description: "Movie Tickets", type: "expense", icon: Coffee },
    { id: 15, category: "Transportation", amount: 350.00, date: "2025-09-11", description: "Car Maintenance", type: "expense", icon: Car },
  ]);

  const handleTransactionsLoaded = (loadedTransactions: Transaction[]) => {
    const transactionsWithIcons = loadedTransactions.map((transaction, index) => ({
      ...transaction,
      id: Date.now() + index, // More robust ID generation
      icon: getCategoryIcon(transaction.category)
    }));
    setTransactions(prev => [...prev, ...transactionsWithIcons]);
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
        id: Date.now(),
        icon: getCategoryIcon(newTransaction.category)
      };
      setTransactions(prev => [...prev, transaction]);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Description', 'Amount', 'Category', 'Type'],
      ...paginatedTransactions.map(t => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`, // Handle quotes in description
        t.amount.toString(),
        t.category,
        t.type
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('food') || categoryLower.includes('dining') || categoryLower.includes('coffee')) return Coffee;
    if (categoryLower.includes('transport') || categoryLower.includes('car') || categoryLower.includes('gas')) return Car;
    if (categoryLower.includes('shopping') || categoryLower.includes('retail')) return ShoppingCart;
    if (categoryLower.includes('bill') || categoryLower.includes('utilities') || categoryLower.includes('rent')) return Home;
    if (categoryLower.includes('salary') || categoryLower.includes('income') || categoryLower.includes('freelance')) return Coins;
    return Wallet;
  };

  const filteredTransactions = useMemo(() => {
    let baseTransactions = transactions;

    // 1. Filter by selected period
    if (selectedPeriod !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (selectedPeriod) {
            case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
            case '1y': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
            default: startDate = new Date(0); // Should not happen with 'all' handled
        }
        baseTransactions = transactions.filter(t => new Date(t.date) >= startDate);
    }
    
    // 2. Apply advanced filters from modal
    let filtered = baseTransactions;
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

  // Dashboard stats are now derived from the final filtered list
  const dashboardData = useMemo(() => {
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;
    const savings = Math.max(0, balance * 0.2);

    const expensesByCategory = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const chartData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
    const chartColors = generateChartColors(chartData.length);

    return { totalIncome, totalExpenses, balance, savings, expensesByCategory, chartData, chartColors };
  }, [filteredTransactions]);


  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const getPaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage > totalPages - 4) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  // Reset to page 1 if current page exceeds total pages after filtering
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    } else if (currentPage === 0 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Update AI service when transactions change
  React.useEffect(() => {
    aiService.setTransactions(transactions);
  }, [transactions]);

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
              {transaction.type === 'income' ? '+' : '-'}₱{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-card border border-border rounded-lg p-2 shadow-elevated">
          <p className="font-medium text-foreground">{`${data.name}: ₱${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
        </div>
      );
    }
    return null;
  };


  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode ? 'dark bg-background' : 'bg-background'
    }`}>
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-lg border-b border-border sticky top-0 z-50 shadow-card">
        {/* Mobile responsive header */}
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-primary p-2 rounded-xl shadow-glow">
                <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  Smart Finance
                </h1>
                <p className="hidden sm:block text-sm text-muted-foreground">
                  AI-Powered Personal Finance Dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-1 sm:space-x-2 bg-muted rounded-lg p-1">
                {['7d', '30d', '90d', '1y', 'all'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      selectedPeriod === period
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {period === 'all' ? 'All' : period.charAt(0).toUpperCase() + period.slice(1)}
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

      <main className="w-full px-4 sm:px-6 lg:px-12 py-8 space-y-8">
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
              <h3 className="text-lg md:text-xl font-bold text-white">AI Financial Assistant</h3>
            </div>
            <div className="relative mb-4">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask me anything about your finances..."
                className="w-full p-3 sm:p-4 pr-10 sm:pr-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleAiQuery()}
                disabled={isAiLoading}
              />
              <button 
                onClick={handleAiQuery}
                disabled={isAiLoading || !aiQuery.trim()}
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors disabled:opacity-50"
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

        {/* Stats Grid - Now responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Current Balance"
            value={dashboardData.balance}
            icon={Coins}
            variant="balance"
          />
          <StatCard
            title="Total Income"
            value={dashboardData.totalIncome}
            icon={TrendingUp}
            variant="income"
          />
          <StatCard
            title="Total Expenses"
            value={dashboardData.totalExpenses}
            icon={TrendingDown}
            variant="expense"
          />
          <StatCard
            title="Estimated Savings"
            value={dashboardData.savings}
            icon={PiggyBank}
            variant="default"
          />
        </div>

        {/* Charts Grid - Now responsive */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <CashFlowChart transactions={filteredTransactions} darkMode={darkMode} />
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col">
            <h2 className="text-xl font-bold mb-6 text-foreground flex-shrink-0">
              Expense Categories
            </h2>
            {dashboardData.chartData.length > 0 ? (
              <>
                <div className="flex-grow h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={dashboardData.chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        dataKey="value"
                        stroke="none"
                        >
                        {dashboardData.chartData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={dashboardData.chartColors[index % dashboardData.chartColors.length]} />
                        ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2 flex-shrink-0 max-h-48 overflow-y-auto">
                  {dashboardData.chartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: dashboardData.chartColors[index % dashboardData.chartColors.length] }}
                        ></div>
                        <span className="text-sm text-muted-foreground">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        ₱{item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No expense data for this period.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold text-foreground">
              Recent Transactions
            </h2>
            <div className="flex items-center space-x-2 sm:space-x-3 w-full md:w-auto">
              <button 
                onClick={() => setShowFilterModal(true)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex-1 md:flex-none justify-center"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Filter</span>
                {(filters.categories.length > 0 || filters.type !== 'all' || filters.dateRange.start || filters.amountRange.min) && (
                  <span className="w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-primary text-white rounded-lg hover:scale-105 transition-transform shadow-glow flex-1 md:flex-none justify-center"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Add New</span>
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center space-x-2 px-3 py-2 bg-success text-success-foreground rounded-lg hover:scale-105 transition-transform flex-1 md:flex-none justify-center"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Export</span>
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
                  
                  {getPaginationItems().map((item, index) => (
                    <PaginationItem key={index}>
                      {typeof item === 'number' ? (
                        <PaginationLink
                          onClick={() => setCurrentPage(item)}
                          isActive={currentPage === item}
                          className="cursor-pointer"
                        >
                          {item}
                        </PaginationLink>
                      ) : (
                        <PaginationEllipsis />
                      )}
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

