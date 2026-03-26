import { type QuestionType } from '@/types';
import { useBuilderStore } from '@/store/builderStore';
import { cn } from '@/utils/cn';

interface QuestionTypeDef {
  type: QuestionType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const questionTypes: QuestionTypeDef[] = [
  {
    type: 'short_answer',
    label: 'Short Answer',
    description: 'Single line text',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8" />
      </svg>
    ),
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    description: 'Multi-line text',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h10" />
      </svg>
    ),
  },
  {
    type: 'multiple_choice',
    label: 'Multiple Choice',
    description: 'Select one option',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    type: 'checkboxes',
    label: 'Checkboxes',
    description: 'Select multiple options',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l3 3 5-5" />
      </svg>
    ),
  },
  {
    type: 'dropdown',
    label: 'Dropdown',
    description: 'Select from a list',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ),
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    type: 'file_upload',
    label: 'File Upload',
    description: 'Accept file uploads',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    type: 'rating',
    label: 'Rating',
    description: 'Star rating scale',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    type: 'section_break',
    label: 'Section Break',
    description: 'Divide the form',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
  },
];

const typeColors: Record<QuestionType, string> = {
  short_answer: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
  paragraph: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400',
  multiple_choice: 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400',
  checkboxes: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-400',
  dropdown: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 dark:text-cyan-400',
  date: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400',
  file_upload: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-400',
  rating: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400',
  section_break: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400',
};

export { questionTypes, typeColors };

export function QuestionTypePanel() {
  const { addQuestion } = useBuilderStore();

  return (
    <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add Question</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Click to add to the form</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {questionTypes.map(({ type, label, description, icon }) => (
          <button
            key={type}
            onClick={() => addQuestion(type)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:scale-[1.01] active:scale-[0.99]',
              'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
            )}
          >
            <div className={cn('p-1.5 rounded-md flex-shrink-0', typeColors[type])}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
