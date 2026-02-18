'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode };

const baseInputStyles = `w-full px-4 py-3 border-2 rounded-md focus:outline-none transition-colors`;
const normalStyles = `border-gray-200 focus:border-brand-green`;
const errorStyles = `border-red-400 focus:border-red-500 bg-red-50`;

export const FormInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          className={`${baseInputStyles} ${error ? errorStyles : normalStyles} ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

export const FormTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          ref={ref}
          className={`${baseInputStyles} ${error ? errorStyles : normalStyles} ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

export const FormSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, children, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          ref={ref}
          className={`${baseInputStyles} ${error ? errorStyles : normalStyles} ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);
FormSelect.displayName = 'FormSelect';

interface FormErrorSummaryProps {
  errors: Record<string, string>;
}

export function FormErrorSummary({ errors }: FormErrorSummaryProps) {
  const errorList = Object.entries(errors).filter(([_, v]) => v);

  if (errorList.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <h4 className="text-red-800 font-medium mb-2 flex items-center gap-2">
        <span>⚠</span> Please fix the following errors:
      </h4>
      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
        {errorList.map(([field, message]) => (
          <li key={field}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
