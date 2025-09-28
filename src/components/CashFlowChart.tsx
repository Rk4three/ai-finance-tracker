import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Transaction {
  date: string;
  amount: number;
  type: 'income' | 'expense' | 'savings';
}

interface CashFlowChartProps {
  transactions: Transaction[];
  darkMode?: boolean;
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ transactions, darkMode = false }) => {
  // Process transactions to create monthly cash flow data
  const processTransactions = () => {
    const monthlyData: { [key: string]: { income: number; expenses: number; savings: number; net: number; balance: number } } = {};
    let runningBalance = 0;

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0, savings: 0, net: 0, balance: 0 };
      }

      if (transaction.type === 'income') {
        monthlyData[monthKey].income += transaction.amount;
        runningBalance += transaction.amount;
      } else if (transaction.type === 'expense') {
        monthlyData[monthKey].expenses += transaction.amount;
        runningBalance -= transaction.amount;
      } else if (transaction.type === 'savings') {
        monthlyData[monthKey].savings += transaction.amount;
        // Savings don't affect running balance since they're separate
      }

      monthlyData[monthKey].net = monthlyData[monthKey].income - monthlyData[monthKey].expenses;
      monthlyData[monthKey].balance = runningBalance;
    });

    // Convert to array format for charts
    return Object.entries(monthlyData).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income: data.income,
      expenses: data.expenses,
      net: data.net,
      balance: data.balance,
    }));
  };

  const chartData = processTransactions();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elevated">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ₱{Math.abs(entry.value).toLocaleString()}
              {entry.dataKey === 'net' && entry.value < 0 ? ' (deficit)' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
        <h2 className="text-xl font-bold text-foreground mb-4">Cash Flow Analysis</h2>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>No transaction data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Cash Flow Analysis</h2>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-income"></div>
            <span className="text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-expense"></div>
            <span className="text-muted-foreground">Expenses</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-muted-foreground">Net Cash Flow</span>
          </div>
        </div>
      </div>
      
      {/* Monthly Income vs Expenses */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Income vs Expenses</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#F3F4F6'} />
            <XAxis dataKey="month" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
            <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net Cash Flow Trend */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Net Cash Flow & Balance Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#F3F4F6'} />
            <XAxis 
              dataKey="month" 
              stroke={darkMode ? '#9CA3AF' : '#6B7280'} 
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke={darkMode ? '#9CA3AF' : '#6B7280'} 
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="net" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              name="Net Cash Flow"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowChart;