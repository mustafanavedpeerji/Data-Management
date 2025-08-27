import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "Unsaved Changes",
  message = "You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?"
}) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-gray-900/50 animate-in fade-in-0 duration-300">
      <div className={`
        relative w-full max-w-md mx-4 rounded-2xl shadow-xl 
        ${theme === 'dark' 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
        animate-in zoom-in-95 duration-300
      `}>
        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20 mb-4">
            <svg className="h-8 w-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          {/* Title */}
          <h3 className={`
            text-lg font-semibold text-center mb-3
            ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}
          `}>
            {title}
          </h3>
          
          {/* Message */}
          <p className={`
            text-sm text-center mb-6 leading-relaxed
            ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
          `}>
            {message}
          </p>
          
          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={onCancel}
              className={`
                px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] shadow-sm
                ${theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }
              `}
            >
              Stay Here
            </button>
            <button
              onClick={onConfirm}
              className="
                bg-red-500 hover:bg-red-600 text-white font-medium
                px-6 py-2 rounded-lg transition-all duration-200 hover:scale-[1.02] shadow-sm
              "
            >
              Leave Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;