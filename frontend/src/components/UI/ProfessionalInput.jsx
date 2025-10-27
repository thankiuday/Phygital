/**
 * Professional Input Component
 * Modern, accessible input with validation states
 * User-friendly design with clear feedback
 */

import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const ProfessionalInput = forwardRef(({
  label,
  error,
  success,
  helperText,
  icon,
  iconPosition = 'left',
  type = 'text',
  showPasswordToggle = false,
  className = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  
  const inputType = type === 'password' && showPassword ? 'text' : type;
  
  const baseClasses = 'block w-full px-3 py-2.5 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1';
  
  const stateClasses = error 
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
    : success 
    ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
    : 'border-slate-600 focus:border-primary-500 focus:ring-primary-500 bg-slate-800/80 hover:border-slate-500';
  
  const iconClasses = iconPosition === 'left' 
    ? 'pl-10' 
    : 'pr-10';
  
  const inputClasses = `
    ${baseClasses}
    ${stateClasses}
    ${icon ? iconClasses : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const iconElement = icon && (
    <div className={`absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none`}>
      <span className="text-slate-400">
        {icon}
      </span>
    </div>
  );

  const passwordToggle = showPasswordToggle && type === 'password' && (
    <button
      type="button"
      className="absolute inset-y-0 right-0 pr-3 flex items-center"
      onClick={() => setShowPassword(!showPassword)}
    >
      {showPassword ? (
        <EyeOff className="h-4 w-4 text-slate-400" />
      ) : (
        <Eye className="h-4 w-4 text-slate-400" />
      )}
    </button>
  );

  const statusIcon = error ? (
    <AlertCircle className="h-4 w-4 text-red-500" />
  ) : success ? (
    <CheckCircle className="h-4 w-4 text-green-500" />
  ) : null;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-200">
          {label}
        </label>
      )}
      
      <div className="relative">
        {iconElement}
        <input
          ref={ref}
          type={inputType}
          className={inputClasses}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {passwordToggle}
        {statusIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {statusIcon}
          </div>
        )}
      </div>
      
      {(error || success || helperText) && (
        <div className="flex items-center space-x-1">
          {error && (
            <p className="text-sm text-red-600 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-sm text-green-600 flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              {success}
            </p>
          )}
          {helperText && !error && !success && (
            <p className="text-sm text-slate-400">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

ProfessionalInput.displayName = 'ProfessionalInput';

export default ProfessionalInput;


