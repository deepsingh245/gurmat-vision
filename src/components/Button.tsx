import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base = "px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2";

  const variants = {
    primary: "bg-saffron-600 text-white hover:bg-saffron-900 shadow-md",
    secondary: "bg-navy-800 text-white hover:bg-navy-900 shadow-md",
    outline: "border-2 border-saffron-600 text-saffron-900 hover:bg-saffron-50",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${isLoading || disabled ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <Loader2 className="animate-spin h-5 w-5 mr-2 text-current" />
      )}
      {children}
    </button>
  );
};

export default Button;
