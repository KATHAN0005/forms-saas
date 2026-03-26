import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { Response } from '@/types';
import { responsesApi } from '@/api/responses';
import { Spinner } from '@/components/ui/Spinner';

interface ResponsesTableProps {
  formId: string;
  questionOrder: string[];
  questionTitles: Record<string, string>;
}

const PAGE_SIZE = 20;

export function ResponsesTable({ formId, questionOrder, questionTitles }: ResponsesTableProps) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await responsesApi.getResponses(formId, { page, limit: PAGE_SIZE });
      setResponses(result.responses);
      setTotal(result.total);
    } catch {
      // handled in parent
    } finally {
      setIsLoading(false);
    }
  }, [formId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const visibleQuestions = questionOrder.filter((qid) => questionTitles[qid]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No responses yet.</p>
      </div>
    );
  }

  const formatAnswer = (val: string | string[] | number | undefined): string => {
    if (val === undefined || val === null) return '—';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                #
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                Submitted
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                Email
              </th>
              {visibleQuestions.map((qid) => (
                <th
                  key={qid}
                  className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 max-w-[200px]"
                >
                  <span className="block truncate" title={questionTitles[qid]}>
                    {questionTitles[qid]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {responses.map((response, idx) => (
              <tr
                key={response.id}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                  {(page - 1) * PAGE_SIZE + idx + 1}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {format(new Date(response.submitted_at), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {response.respondent_email ?? '—'}
                </td>
                {visibleQuestions.map((qid) => (
                  <td
                    key={qid}
                    className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px]"
                  >
                    <span
                      className="block truncate"
                      title={formatAnswer(response.answers[qid])}
                    >
                      {formatAnswer(response.answers[qid])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} total response{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
