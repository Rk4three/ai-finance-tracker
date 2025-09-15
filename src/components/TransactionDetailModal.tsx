import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, Tag, Coins, FileText, Edit3, Trash2 } from 'lucide-react';

interface Transaction {
  id: number;
  category: string;
  amount: number;
  date: string;
  description: string;
  type: "income" | "expense";
  icon?: React.ComponentType<{ className?: string }>;
}

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: number) => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!transaction) return null;

  const IconComponent = transaction.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {IconComponent && (
              <div className="bg-muted p-2 rounded-lg">
                <IconComponent className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            Transaction Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              Description
            </div>
            <p className="font-semibold text-foreground">{transaction.description}</p>
          </div>

          <Separator />

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="w-4 h-4" />
              Amount
            </div>
            <p className={`text-2xl font-bold ${
              transaction.type === 'income' ? 'text-income' : 'text-expense'
            }`}>
              {transaction.type === 'income' ? '+' : '-'}₱{transaction.amount.toLocaleString()}
            </p>
          </div>

          <Separator />

          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="w-4 h-4" />
              Category
            </div>
            <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
              {transaction.category}
            </Badge>
          </div>

          <Separator />

          {/* Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Date
            </div>
            <p className="text-foreground">
              {new Date(transaction.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => {
                if (onEdit && transaction) {
                  onEdit(transaction);
                  onClose();
                }
              }}
              disabled={!onEdit}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (onDelete && transaction && window.confirm('Are you sure you want to delete this transaction?')) {
                  onDelete(transaction.id);
                  onClose();
                }
              }}
              disabled={!onDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetailModal;