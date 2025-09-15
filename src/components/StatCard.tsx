import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number }[];
  variant?: 'default' | 'income' | 'expense' | 'balance';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  trend,
  variant = 'default'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'income':
        return 'bg-gradient-income border-income/20';
      case 'expense':
        return 'bg-gradient-expense border-expense/20';
      case 'balance':
        return 'bg-gradient-primary border-primary/20';
      default:
        return 'bg-card border-border';
    }
  };

  const getIconClasses = () => {
    switch (variant) {
      case 'income':
        return 'bg-income/10 text-income';
      case 'expense':
        return 'bg-expense/10 text-expense';
      case 'balance':
        return 'bg-primary/10 text-primary';
      default:
        return `bg-muted ${changeType === 'positive' ? 'text-success' : 'text-destructive'}`;
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case 'income':
      case 'expense':
      case 'balance':
        return 'text-white';
      default:
        return 'text-foreground';
    }
  };

  const getTitleColor = () => {
    switch (variant) {
      case 'income':
      case 'expense':
      case 'balance':
        return 'text-white/80';
      default:
        return 'text-muted-foreground';
    }
  };

  const getChangeClasses = () => {
    const baseClasses = 'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium';
    
    if (variant === 'income' || variant === 'expense' || variant === 'balance') {
      return `${baseClasses} bg-white/20 text-white`;
    }
    
    return `${baseClasses} ${
      changeType === 'positive' 
        ? 'bg-success/10 text-success' 
        : 'bg-destructive/10 text-destructive'
    }`;
  };

  return (
    <div className={`
      ${getVariantClasses()} 
      rounded-2xl p-6 border backdrop-blur-sm transition-all duration-300 
      hover:scale-105 hover:shadow-elevated group cursor-pointer
    `}>
      <div className="flex items-center justify-between mb-4">
        <div className={`${getIconClasses()} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={getChangeClasses()}>
          {changeType === 'positive' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span>{change}</span>
        </div>
      </div>
      
      <div>
        <p className={`text-2xl font-bold ${getValueColor()}`}>
          ₱{typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className={`text-sm ${getTitleColor()} mt-1`}>{title}</p>
      </div>
      
      {trend && trend.length > 0 && (
        <div className="mt-4 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={variant === 'income' || variant === 'expense' || variant === 'balance' ? '#ffffff' : 
                        changeType === 'positive' ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default StatCard;