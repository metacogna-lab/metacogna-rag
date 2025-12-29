
import React, { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

// --- Card ---
interface PaperCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const PaperCard: React.FC<PaperCardProps> = ({ children, className = '', title, action }) => (
  <div className={`bg-paper border-2 border-ink shadow-hard rounded-sm p-0 relative flex flex-col ${className}`}>
    {title && (
      <div className="border-b-2 border-ink px-6 py-4 flex justify-between items-center bg-surface">
        <h3 className="font-serif font-bold text-lg tracking-tight text-ink flex items-center gap-2">
          {title}
        </h3>
        {action}
      </div>
    )}
    <div className="p-6 flex-1">
      {children}
    </div>
  </div>
);

// --- Button ---
interface PaperButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const PaperButton: React.FC<PaperButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  icon,
  size = 'md',
  ...props 
}) => {
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3 text-base"
  };

  const baseStyles = "inline-flex items-center justify-center gap-2 font-sans font-bold uppercase tracking-wider transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-sm";
  
  const variants = {
    primary: "bg-ink text-paper border-2 border-ink shadow-hard hover:bg-accent hover:border-ink hover:text-ink",
    secondary: "bg-paper text-ink border-2 border-ink shadow-hard hover:bg-surface",
    ghost: "bg-transparent text-ink hover:bg-surface border-2 border-transparent hover:border-ink hover:shadow-hard",
    danger: "bg-paper text-warning border-2 border-warning shadow-hard hover:bg-warning hover:text-paper hover:border-ink"
  };

  return (
    <button className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
};

// --- Input ---
interface PaperInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const PaperInput: React.FC<PaperInputProps> = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-xs font-mono font-bold uppercase tracking-widest text-gray-500">{label}</label>}
    <input 
      className={`w-full bg-paper border-2 border-ink px-4 py-3 font-mono text-sm text-ink placeholder:text-gray-400 rounded-sm focus:outline-none focus:shadow-hard focus:border-accent transition-all ${error ? 'border-warning' : ''} ${className}`}
      {...props} 
    />
    {error && <span className="text-xs text-warning font-mono font-bold">{error}</span>}
  </div>
);

// --- Badge ---
export const PaperBadge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'red' | 'ink' }> = ({ children, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-700',
    green: 'bg-accent-light text-accent-hover border-accent',
    red: 'bg-red-50 text-warning border-warning',
    ink: 'bg-surface text-ink border-ink'
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest border rounded-sm ${colors[color]} shadow-sm`}>
      {children}
    </span>
  );
};

// --- Markdown Text ---
export const MarkdownText: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(\*\*.*?\*\*|`.*?`|```[\s\S]*?```)/g);
  
  return (
    <span className="whitespace-pre-wrap font-sans leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-ink">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={index} className="bg-surface border border-gray-200 px-1 py-0.5 rounded-sm text-sm font-mono text-accent-hover">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('```') && part.endsWith('```')) {
           return (
             <div key={index} className="my-2 bg-ink text-paper p-4 border-2 border-gray-500 rounded-sm text-xs font-mono overflow-x-auto shadow-hard-sm">
               {part.slice(3, -3).trim()}
             </div>
           );
        }
        return part;
      })}
    </span>
  );
};
    