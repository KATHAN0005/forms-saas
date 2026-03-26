import { useBuilderStore } from '@/store/builderStore';
import type { Question, ConditionalLogic, ValidationRule } from '@/types';
import { cn } from '@/utils/cn';

export function QuestionEditor() {
  const { schema, selectedQuestionId, updateQuestion } = useBuilderStore();
  const question = selectedQuestionId ? schema.questions[selectedQuestionId] : null;

  if (!question) {
    return (
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Select a question to edit it</p>
        </div>
      </div>
    );
  }

  const update = (updates: Partial<Question>) => updateQuestion(question.id, updates);

  const addOption = () => {
    const options = [...(question.options ?? [])];
    options.push(`Option ${options.length + 1}`);
    update({ options });
  };

  const updateOption = (idx: number, value: string) => {
    const options = [...(question.options ?? [])];
    options[idx] = value;
    update({ options });
  };

  const removeOption = (idx: number) => {
    const options = (question.options ?? []).filter((_, i) => i !== idx);
    update({ options });
  };

  const addLogicRule = () => {
    const otherQuestions = schema.order
      .filter((id) => id !== question.id)
      .map((id) => schema.questions[id]);
    if (otherQuestions.length === 0) return;
    const newRule: ConditionalLogic = {
      sourceQuestionId: question.id,
      condition: 'equals',
      value: '',
      action: 'show',
      targetQuestionId: otherQuestions[0]?.id ?? '',
    };
    update({ logic: [...(question.logic ?? []), newRule] });
  };

  const updateLogicRule = (idx: number, updates: Partial<ConditionalLogic>) => {
    const logic = (question.logic ?? []).map((r, i) => (i === idx ? { ...r, ...updates } : r));
    update({ logic });
  };

  const removeLogicRule = (idx: number) => {
    const logic = (question.logic ?? []).filter((_, i) => i !== idx);
    update({ logic });
  };

  const addValidationRule = () => {
    const newRule: ValidationRule = { type: 'min_length', value: 0 };
    update({ validation: [...(question.validation ?? []), newRule] });
  };

  const updateValidationRule = (idx: number, updates: Partial<ValidationRule>) => {
    const validation = (question.validation ?? []).map((r, i) => (i === idx ? { ...r, ...updates } : r));
    update({ validation });
  };

  const removeValidationRule = (idx: number) => {
    const validation = (question.validation ?? []).filter((_, i) => i !== idx);
    update({ validation });
  };

  const hasOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type);
  const otherQuestions = schema.order
    .filter((id) => id !== question.id)
    .map((id) => schema.questions[id]);

  return (
    <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Question Settings</h2>
      </div>

      <div className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            Question title
          </label>
          <input
            type="text"
            value={question.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Enter question..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        {question.type !== 'section_break' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Description <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={question.description ?? ''}
              onChange={(e) => update({ description: e.target.value || undefined })}
              placeholder="Add a description or hint..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}

        {/* Required toggle */}
        {question.type !== 'section_break' && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Required</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Respondents must answer</p>
            </div>
            <button
              onClick={() => update({ required: !question.required })}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                question.required ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  question.required ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        )}

        {/* Options (for choice-type questions) */}
        {hasOptions && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
              Options
            </label>
            <div className="space-y-2">
              {(question.options ?? []).map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-shrink-0 text-gray-300 dark:text-gray-600">
                    {question.type === 'checkboxes' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth={2} />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="9" strokeWidth={2} />
                      </svg>
                    )}
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeOption(idx)}
                    disabled={(question.options ?? []).length <= 1}
                    className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={addOption}
                className="w-full text-left px-2.5 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add option
              </button>
            </div>
          </div>
        )}

        {/* Rating settings */}
        {question.type === 'rating' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Max rating: {question.maxRating ?? 5}
            </label>
            <input
              type="range"
              min={2}
              max={10}
              value={question.maxRating ?? 5}
              onChange={(e) => update({ maxRating: parseInt(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>2</span>
              <span>10</span>
            </div>
          </div>
        )}

        {/* Placeholder for short_answer/paragraph */}
        {(question.type === 'short_answer' || question.type === 'paragraph') && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Placeholder text
            </label>
            <input
              type="text"
              value={question.placeholder ?? ''}
              onChange={(e) => update({ placeholder: e.target.value || undefined })}
              placeholder="Placeholder hint..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* File upload settings */}
        {question.type === 'file_upload' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Accepted file types
              </label>
              <input
                type="text"
                value={(question.acceptedFileTypes ?? []).join(', ')}
                onChange={(e) =>
                  update({
                    acceptedFileTypes: e.target.value
                      ? e.target.value.split(',').map((s) => s.trim())
                      : [],
                  })
                }
                placeholder=".pdf, .png, .jpg"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Comma-separated extensions</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Max file size (MB): {question.maxFileSize ?? 10}
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={question.maxFileSize ?? 10}
                onChange={(e) => update({ maxFileSize: parseInt(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 MB</span>
                <span>100 MB</span>
              </div>
            </div>
          </div>
        )}

        {/* Conditional logic */}
        {question.type !== 'section_break' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Conditional Logic
              </label>
              <button
                onClick={addLogicRule}
                disabled={otherQuestions.length === 0}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40"
              >
                + Add rule
              </button>
            </div>
            {(question.logic ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">No logic rules. Add one above.</p>
            ) : (
              <div className="space-y-2">
                {(question.logic ?? []).map((rule, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-600 dark:text-gray-300">Rule {idx + 1}</span>
                      <button onClick={() => removeLogicRule(idx)} className="text-gray-400 hover:text-red-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={rule.condition}
                        onChange={(e) => updateLogicRule(idx, { condition: e.target.value as ConditionalLogic['condition'] })}
                        className="col-span-2 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="equals">equals</option>
                        <option value="not_equals">not equals</option>
                        <option value="contains">contains</option>
                        <option value="greater_than">greater than</option>
                        <option value="less_than">less than</option>
                      </select>
                      <input
                        type="text"
                        value={rule.value}
                        onChange={(e) => updateLogicRule(idx, { value: e.target.value })}
                        placeholder="Value..."
                        className="col-span-2 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <select
                        value={rule.action}
                        onChange={(e) => updateLogicRule(idx, { action: e.target.value as ConditionalLogic['action'] })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="show">show</option>
                        <option value="hide">hide</option>
                        <option value="jump_to">jump to</option>
                      </select>
                      <select
                        value={rule.targetQuestionId ?? ''}
                        onChange={(e) => updateLogicRule(idx, { targetQuestionId: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">Select question</option>
                        {otherQuestions.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title || 'Untitled'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Validation rules */}
        {(question.type === 'short_answer' || question.type === 'paragraph') && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Validation
              </label>
              <button onClick={addValidationRule} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                + Add rule
              </button>
            </div>
            {(question.validation ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">No validation rules.</p>
            ) : (
              <div className="space-y-2">
                {(question.validation ?? []).map((rule, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-600 dark:text-gray-300">Rule {idx + 1}</span>
                      <button onClick={() => removeValidationRule(idx)} className="text-gray-400 hover:text-red-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <select
                      value={rule.type}
                      onChange={(e) => updateValidationRule(idx, { type: e.target.value as ValidationRule['type'] })}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="min_length">Min length</option>
                      <option value="max_length">Max length</option>
                      <option value="email">Email format</option>
                      <option value="url">URL format</option>
                      <option value="regex">Regex pattern</option>
                    </select>
                    {(rule.type === 'min_length' || rule.type === 'max_length' || rule.type === 'regex') && (
                      <input
                        type={rule.type === 'regex' ? 'text' : 'number'}
                        value={rule.value ?? ''}
                        onChange={(e) => updateValidationRule(idx, { value: rule.type === 'regex' ? e.target.value : parseInt(e.target.value) })}
                        placeholder={rule.type === 'regex' ? 'Pattern...' : 'Value...'}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    )}
                    <input
                      type="text"
                      value={rule.message ?? ''}
                      onChange={(e) => updateValidationRule(idx, { message: e.target.value || undefined })}
                      placeholder="Custom error message..."
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


