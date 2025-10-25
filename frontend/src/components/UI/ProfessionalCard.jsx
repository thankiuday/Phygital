/**
 * Professional Card Component
 * Clean, modern card design for better content organization
 * Responsive and accessible
 */

import React from 'react';

const ProfessionalCard = ({
  children,
  title,
  subtitle,
  header,
  footer,
  variant = 'default',
  padding = 'md',
  className = '',
  hover = false,
  ...props
}) => {
  const baseClasses = 'bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200';
  
  const variants = {
    default: 'bg-white border-gray-200',
    elevated: 'bg-white border-gray-200 shadow-lg',
    outlined: 'bg-white border-2 border-gray-300',
    filled: 'bg-gray-50 border-gray-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200'
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const hoverClasses = hover ? 'hover:shadow-md hover:border-gray-300 cursor-pointer' : '';
  
  const cardClasses = `
    ${baseClasses}
    ${variants[variant]}
    ${paddingClasses[padding]}
    ${hoverClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={cardClasses} {...props}>
      {header && (
        <div className="border-b border-gray-200 pb-4 mb-4">
          {header}
        </div>
      )}
      
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div className="text-gray-700">
        {children}
      </div>
      
      {footer && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          {footer}
        </div>
      )}
    </div>
  );
};

export default ProfessionalCard;

