import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'income' | 'expense' | 'balance';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'income':
        return 'bg-gradient-income border-income/20 text-white';
      case 'expense':
        return 'bg-gradient-expense border-expense/20 text-white';
      case 'balance':
        return 'bg-gradient-primary border-primary/20 text-white';
      default:
        return 'bg-card border-border text-foreground';
    }
  };

  const getIconClasses = () => {
    switch (variant) {
      case 'income':
      case 'expense':
      case 'balance':
        return 'bg-white/20 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={`
      ${getVariantClasses()} 
      rounded-2xl p-6 border backdrop-blur-sm transition-all duration-300 
      hover:scale-105 hover:shadow-elevated group cursor-pointer
    `}>
      <div className="flex items-start justify-between mb-4">
        <div className={`${getIconClasses()} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      <div>
        <p className={`text-2xl font-bold`}>
          ₱{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
        </p>
        <p className={`text-sm mt-1 ${variant === 'default' ? 'text-muted-foreground' : 'text-white/80'}`}>{title}</p>
      </div>
    </div>
  );
};

export default StatCard;
