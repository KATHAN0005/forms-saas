import { useState } from 'react';
import type { Question } from '@/types';
import { cn } from '@/utils/cn';

interface QuestionRendererProps {
  question: Question;
  value: string | string[] | number | undefined;
  onChange: (value: string | string[] | number) => void;
  error?: string;
}

export function QuestionRenderer({ question, value, onChange, error }: QuestionRendererProps) {
  const [hoveredStar, setHoveredStar] = useState(0);

  const inputClass = cn(
    'w-full px-3 py-2.5 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors',
    error
      ? 'border-red-400 focus:ring-red-400'
      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
  );

  if (question.type === 'section_break') {
    return (
      <div className="py-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{question.title}</h3>
        {question.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{question.description}</p>
        )}
        <div className="mt-3 border-b border-gray-200 dark:border-gray-600" />
      </div>
    );
  }

  const renderInput = () => {
    switch (question.type) {
      case 'short_answer':
        return (
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder ?? 'Your answer'}
            className={inputClass}
          />
        );

      case 'paragraph':
        return (
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder ?? 'Your answer'}
            rows={4}
            className={cn(inputClass, 'resize-none')}
          />
        );

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {(question.options ?? []).map((option, idx) => (
              <label
                key={idx}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  value === option
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={() => onChange(option)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkboxes': {
        const checked = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {(question.options ?? []).map((option, idx) => (
              <label
                key={idx}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  checked.includes(option)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={checked.includes(option)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...checked, option]
                      : checked.filter((v) => v !== option);
                    onChange(next);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'dropdown':
        return (
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Select an option</option>
            {(question.options ?? []).map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        );

      case 'file_upload':
        return (
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
              error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
            )}
          >
            <input
              type="file"
              id={`file-${question.id}`}
              accept={(question.acceptedFileTypes ?? []).join(',')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange(file.name);
              }}
            />
            <label
              htmlFor={`file-${question.id}`}
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {value ? (
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{value as string}</span>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Click to upload a file
                  </span>
                  {question.acceptedFileTypes && question.acceptedFileTypes.length > 0 && (
                    <span className="text-xs text-gray-400">
                      Accepted: {question.acceptedFileTypes.join(', ')}
                    </span>
                  )}
                  {question.maxFileSize && (
                    <span className="text-xs text-gray-400">Max size: {question.maxFileSize} MB</span>
                  )}
                </>
              )}
            </label>
          </div>
        );

      case 'rating': {
        const maxRating = question.maxRating ?? 5;
        const ratingValue = (value as number) ?? 0;
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => onChange(star)}
                className="transition-transform hover:scale-110 active:scale-95"
                title={`${star} star${star !== 1 ? 's' : ''}`}
              >
                <svg
                  className={cn(
                    'w-8 h-8 transition-colors',
                    star <= (hoveredStar || ratingValue)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300 dark:text-gray-600 fill-gray-300 dark:fill-gray-600'
                  )}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            ))}
            {ratingValue > 0 && (
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {ratingValue} / {maxRating}
              </span>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
          {question.title}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {question.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{question.description}</p>
        )}
      </div>
      {renderInput()}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
