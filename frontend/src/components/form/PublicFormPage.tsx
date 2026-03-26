import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formsApi } from '@/api/forms';
import { responsesApi } from '@/api/responses';
import { QuestionRenderer } from './QuestionRenderer';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import type { Form } from '@/types';
import { generateId } from '@/utils/uuid';

type AnswerMap = Record<string, string | string[] | number>;

const PARTIAL_SAVE_INTERVAL = 10_000;

export function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [formPassword, setFormPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const sessionId = useRef(generateId());

  const loadForm = useCallback(async (password?: string) => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const loaded = await formsApi.getPublic(slug, password);
      setForm(loaded);
      setPasswordModalOpen(false);

      // Restore partial answers from localStorage
      const saved = localStorage.getItem(`form-partial-${slug}`);
      if (saved) {
        try {
          setAnswers(JSON.parse(saved));
        } catch { /* ignore */ }
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setPasswordModalOpen(true);
        setPasswordError(password ? 'Incorrect password. Try again.' : '');
      } else if (status === 404) {
        setError('This form does not exist.');
      } else if (status === 410) {
        setError('This form is closed and no longer accepting responses.');
      } else {
        setError('Failed to load form. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  // Auto-save partial responses to localStorage
  useEffect(() => {
    if (!form || submitted) return;
    const timer = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        localStorage.setItem(`form-partial-${slug}`, JSON.stringify(answers));
      }
    }, PARTIAL_SAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [form, answers, slug, submitted]);

  const validate = (): boolean => {
    if (!form) return false;
    const errors: Record<string, string> = {};
    for (const qid of form.schema.order) {
      const question = form.schema.questions[qid];
      if (!question || question.type === 'section_break') continue;
      if (question.required) {
        const val = answers[qid];
        if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[qid] = 'This field is required.';
        }
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordModalClose = () => {
    setPasswordModalOpen(false);
    setError('This form requires a password. Please contact the form owner.');
  };

  const handleSubmit = async () => {
    if (!form || !slug) return;
    if (!validate()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await responsesApi.submit(slug, {
        answers,
        session_id: sessionId.current,
      });
      setSubmitted(true);
      localStorage.removeItem(`form-partial-${slug}`);
      toast.success('Response submitted!');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to submit. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = form
    ? form.schema.order.filter((qid) => {
        const q = form.schema.questions[qid];
        if (!q || q.type === 'section_break') return false;
        const val = answers[qid];
        return val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
      }).length
    : 0;

  const totalQuestions = form
    ? form.schema.order.filter((qid) => {
        const q = form.schema.questions[qid];
        return q && q.type !== 'section_break';
      }).length
    : 0;

  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  if (isLoading && !passwordModalOpen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Form Unavailable</h2>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted && form) {
    const message = form.settings.confirmation_message ?? 'Thank you for your response!';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Response Submitted!</h2>
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
          {form.settings.allow_multiple_submissions && (
            <button
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setValidationErrors({});
              }}
              className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Submit another response
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Password modal */}
      <Modal
        isOpen={passwordModalOpen}
        title="Password Protected"
        onClose={handlePasswordModalClose}
        footer={
          <button
            onClick={() => loadForm(formPassword)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Submit
          </button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This form is password protected. Enter the password to continue.
          </p>
          <input
            type="password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadForm(formPassword)}
            placeholder="Enter password..."
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
        </div>
      </Modal>

      {form && (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Progress bar */}
            {form.settings.show_progress_bar && totalQuestions > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  <span>{answeredCount} of {totalQuestions} answered</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Form header */}
            <div
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4 border-t-4"
              style={{ borderTopColor: form.theme?.primaryColor ?? '#3B82F6' }}
            >
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{form.title}</h1>
              {form.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">{form.description}</p>
              )}
              {form.settings.collect_email && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email will be collected
                </p>
              )}
            </div>

            {/* Questions */}
            <div className="space-y-4">
              {form.schema.order.map((qid) => {
                const question = form.schema.questions[qid];
                if (!question) return null;

                if (question.type === 'section_break') {
                  return (
                    <div key={qid} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                      <QuestionRenderer
                        question={question}
                        value={undefined}
                        onChange={() => {}}
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={qid}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <QuestionRenderer
                      question={question}
                      value={answers[qid]}
                      onChange={(val) => {
                        setAnswers((prev) => ({ ...prev, [qid]: val }));
                        if (validationErrors[qid]) {
                          setValidationErrors((prev) => {
                            const next = { ...prev };
                            delete next[qid];
                            return next;
                          });
                        }
                      }}
                      error={validationErrors[qid]}
                    />
                  </div>
                );
              })}
            </div>

            {/* Submit button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                style={{ backgroundColor: form.theme?.primaryColor ?? undefined }}
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Submit
                  </>
                )}
              </button>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
              Powered by Forms
            </p>
          </div>
        </div>
      )}
    </>
  );
}
