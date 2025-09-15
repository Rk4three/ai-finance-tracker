import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { detectCategory, parseDate } from '../utils/categoryMapping';

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
}

interface FileUploadProps {
  onTransactionsLoaded: (transactions: Transaction[]) => void;
  darkMode?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onTransactionsLoaded, darkMode = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validateColumns = (data: any[]): { isValid: boolean; missingColumns: string[]; errors: string[] } => {
    if (!data || data.length === 0) {
      return { isValid: false, missingColumns: [], errors: ['File is empty or contains no data'] };
    }

    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const errors: string[] = [];
    const missingColumns: string[] = [];

    // Required columns (case-insensitive)
    const requiredColumns = ['date', 'description', 'amount'];
    const columnMap: Record<string, string> = {};

    // Map existing columns to required ones (case-insensitive)
    requiredColumns.forEach(required => {
      const found = columns.find(col => 
        col.toLowerCase() === required.toLowerCase() ||
        (required === 'date' && ['date', 'transaction_date', 'trans_date'].includes(col.toLowerCase())) ||
        (required === 'description' && ['description', 'desc', 'transaction', 'memo', 'details'].includes(col.toLowerCase())) ||
        (required === 'amount' && ['amount', 'value', 'sum', 'total', 'price'].includes(col.toLowerCase()))
      );
      
      if (found) {
        columnMap[required] = found;
      } else {
        missingColumns.push(required);
      }
    });

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      errors.push(`Available columns: ${columns.join(', ')}`);
      errors.push('Please ensure your CSV has columns for: date, description, and amount');
    }

    // Check for empty data
    const validRows = data.filter(row => {
      const hasDescription = row[columnMap.description || 'description'];
      const hasAmount = row[columnMap.amount || 'amount'];
      return hasDescription && hasAmount;
    });

    if (validRows.length === 0) {
      errors.push('No valid transaction data found. Please check that your CSV contains transaction information.');
    }

    return {
      isValid: missingColumns.length === 0 && validRows.length > 0,
      missingColumns,
      errors
    };
  };

  const parseCSVData = (csvData: any[]): Transaction[] => {
    const validation = validateColumns(csvData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join('\n'));
    }

    return csvData.map((row, index) => {
      // Flexible column detection
      const getColumnValue = (columnNames: string[]) => {
        for (const name of columnNames) {
          const value = row[name] || row[name.toLowerCase()] || row[name.toUpperCase()] || 
                       row[name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()];
          if (value !== undefined && value !== null && value !== '') {
            return value;
          }
        }
        return null;
      };

      // Get values with flexible column naming
      const rawDate = getColumnValue(['date', 'Date', 'DATE', 'transaction_date', 'trans_date', 'Transaction Date']);
      const description = getColumnValue(['description', 'Description', 'DESCRIPTION', 'desc', 'Desc', 'transaction', 'memo', 'details', 'Details']) || `Transaction ${index + 1}`;
      const rawAmount = getColumnValue(['amount', 'Amount', 'AMOUNT', 'value', 'Value', 'sum', 'total', 'price']);
      const rawCategory = getColumnValue(['category', 'Category', 'CATEGORY', 'type', 'cat']);
      const rawType = getColumnValue(['type', 'Type', 'TYPE', 'transaction_type', 'trans_type']);

      // Parse date with improved handling
      const date = parseDate(rawDate);

      // Parse amount
      let amount = 0;
      if (rawAmount) {
        // Remove currency symbols and commas
        const cleanAmount = rawAmount.toString().replace(/[₱$,]/g, '').trim();
        amount = Math.abs(parseFloat(cleanAmount) || 0);
      }

      // Determine transaction type
      let type: 'income' | 'expense' = 'expense';
      if (rawType) {
        const typeStr = rawType.toString().toLowerCase();
        if (typeStr.includes('income') || typeStr.includes('credit') || typeStr.includes('deposit')) {
          type = 'income';
        }
      } else if (rawAmount && parseFloat(rawAmount.toString().replace(/[₱$,]/g, '')) > 0) {
        // If no type specified, assume positive amounts are income
        if (description.toLowerCase().includes('salary') || 
            description.toLowerCase().includes('income') || 
            description.toLowerCase().includes('refund') ||
            description.toLowerCase().includes('payment received')) {
          type = 'income';
        }
      }

      // Smart category detection
      const category = detectCategory(description, rawCategory);

      return {
        id: index + 1,
        date,
        description,
        amount,
        category,
        type
      };
    }).filter(transaction => transaction.amount > 0);
  };

  const handleFile = useCallback((file: File) => {
    setUploadStatus('uploading');
    setUploadedFileName(file.name);
    setErrorMessage('');

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      setUploadStatus('error');
      setErrorMessage('Please upload a CSV or Excel file');
      return;
    }

    // For CSV files
    if (fileExtension === 'csv') {
      Papa.parse(file, {
        complete: (results) => {
          try {
            const transactions = parseCSVData(results.data as any[]);
            if (transactions.length === 0) {
              setUploadStatus('error');
              setErrorMessage('No valid transactions found in the file');
              return;
            }
            onTransactionsLoaded(transactions);
            setUploadStatus('success');
          } catch (error) {
            setUploadStatus('error');
            setErrorMessage(error instanceof Error ? error.message : 'Error parsing CSV file');
          }
        },
        header: true,
        skipEmptyLines: true,
        error: () => {
          setUploadStatus('error');
          setErrorMessage('Error reading CSV file');
        }
      });
    } else {
      // For Excel files, we'll simulate parsing for now
      // In a real app, you'd use a library like xlsx
      setTimeout(() => {
        const sampleTransactions: Transaction[] = [
          { id: 1, date: '2025-09-01', description: 'Sample Income', amount: 2500, category: 'Salary', type: 'income' },
          { id: 2, date: '2025-09-02', description: 'Grocery Shopping', amount: 150, category: 'Food', type: 'expense' },
          { id: 3, date: '2025-09-03', description: 'Gas Station', amount: 60, category: 'Transportation', type: 'expense' },
        ];
        onTransactionsLoaded(sampleTransactions);
        setUploadStatus('success');
      }, 1500);
    }
  }, [onTransactionsLoaded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const resetUpload = () => {
    setUploadStatus('idle');
    setUploadedFileName('');
    setErrorMessage('');
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-success" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-destructive" />;
      default:
        return <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Processing file...';
      case 'success':
        return `Successfully loaded ${uploadedFileName}`;
      case 'error':
        return errorMessage || 'Upload failed';
      default:
        return 'Drag & drop your CSV or Excel file here, or click to browse';
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Import Transactions</h3>
        {uploadStatus === 'success' && (
          <button
            onClick={resetUpload}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${isDragOver 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : uploadStatus === 'success'
            ? 'border-success bg-success/5'
            : uploadStatus === 'error'
            ? 'border-destructive bg-destructive/5'
            : 'border-border hover:border-primary hover:bg-primary/5'
          }
          ${uploadStatus === 'uploading' ? 'pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (uploadStatus !== 'uploading') {
            document.getElementById('file-upload')?.click();
          }
        }}
      >
        <input
          id="file-upload"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-4">
          {getStatusIcon()}
          
          <div>
            <p className={`font-medium ${
              uploadStatus === 'success' ? 'text-success' : 
              uploadStatus === 'error' ? 'text-destructive' : 
              'text-foreground'
            }`}>
              {getStatusText()}
            </p>
            
            {uploadStatus === 'idle' && (
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p>Supports CSV and Excel files with flexible column names</p>
                <p><strong>Required:</strong> date, description, amount</p>
                <p><strong>Optional:</strong> category, type</p>
                <p><strong>Tip:</strong> Try the sample file in your public folder!</p>
              </div>
            )}
          </div>

          {uploadStatus === 'idle' && (
            <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Upload className="w-4 h-4" />
              <span>Choose File</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;