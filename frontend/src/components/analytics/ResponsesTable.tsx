import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import type { Response } from '@/types';
import { responsesApi } from '@/api/responses';
import { Spinner } from '@/components/ui/Spinner';

interface ResponsesTableProps {
  formId: string;
  questionOrder: string[];
  questionTitles: Record<string, string>;
  onRowClick?: (response: Response) => void;
}

type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

export function ResponsesTable({ formId, questionOrder, questionTitles, onRowClick }: ResponsesTableProps) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'submitted_at' | 'email'>('submitted_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  const toggleSort = (key: 'submitted_at' | 'email') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) {
      return (
        <svg className="w-3 h-3 text-gray-400 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDir === 'asc' ? (
      <svg className="w-3 h-3 text-blue-500 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-blue-500 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return responses;
    return responses.filter((r) => {
      const emailMatch = r.respondent_email?.toLowerCase().includes(q);
      const dateMatch = format(new Date(r.submitted_at), 'MMM d, yyyy').toLowerCase().includes(q);
      return emailMatch || dateMatch;
    });
  }, [responses, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string, vb: string;
      if (sortKey === 'email') {
        va = a.respondent_email ?? '';
        vb = b.respondent_email ?? '';
      } else {
        va = a.submitted_at;
        vb = b.submitted_at;
      }
      const cmp = va.localeCompare(vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const visibleQuestions = questionOrder.filter((qid) => questionTitles[qid]);

  const formatAnswer = (val: string | string[] | number | undefined): string => {
    if (val === undefined || val === null) return '—';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by email or date..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {filtered.length} of {total} response{total !== 1 ? 's' : ''}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
          {searchQuery ? (
            <>
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No responses match your filter</p>
              <button onClick={() => setSearchQuery('')} className="mt-2 text-sm text-blue-600 hover:underline">
                Clear filter
              </button>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No responses yet.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">#</th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none hover:text-gray-900 dark:hover:text-white"
                  onClick={() => toggleSort('submitted_at')}
                >
                  Submitted <SortIcon col="submitted_at" />
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none hover:text-gray-900 dark:hover:text-white"
                  onClick={() => toggleSort('email')}
                >
                  Email <SortIcon col="email" />
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
              {sorted.map((response, idx) => (
                <tr
                  key={response.id}
                  onClick={() => onRowClick?.(response)}
                  className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
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
                    <td key={qid} className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px]">
                      <span className="block truncate" title={formatAnswer(response.answers[qid])}>
                        {formatAnswer(response.answers[qid])}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

