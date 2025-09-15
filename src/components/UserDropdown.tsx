import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, CreditCard, BarChart3, X } from 'lucide-react';

interface UserDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ isOpen, onClose }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const menuItems = [
    { icon: BarChart3, label: 'Dashboard', action: () => console.log('Dashboard') },
    { icon: CreditCard, label: 'Payment Methods', action: () => console.log('Payment Methods') },
    { icon: Settings, label: 'Settings', action: () => console.log('Settings') },
    { icon: LogOut, label: 'Sign Out', action: () => console.log('Sign Out'), danger: true },
  ];

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-elevated z-50"
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-foreground">John Doe</p>
            <p className="text-sm text-muted-foreground">john@example.com</p>
          </div>
        </div>
      </div>
      
      <div className="py-2">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              item.action();
              onClose();
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-muted transition-colors ${
              item.danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UserDropdown;