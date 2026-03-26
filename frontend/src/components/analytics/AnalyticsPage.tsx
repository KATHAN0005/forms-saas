import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formsApi } from '@/api/forms';
import { responsesApi } from '@/api/responses';
import { Spinner } from '@/components/ui/Spinner';
import { ResponsesTable } from './ResponsesTable';
import type { Form, Analytics } from '@/types';
import { format } from 'date-fns';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

type ActiveTab = 'overview' | 'responses';

export function AnalyticsPage() {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    if (!formId) return;
    setIsLoading(true);
    try {
      const [loadedForm, loadedAnalytics] = await Promise.all([
        formsApi.get(formId),
        responsesApi.getAnalytics(formId),
      ]);
      setForm(loadedForm);
      setAnalytics(loadedAnalytics);
    } catch {
      toast.error('Failed to load analytics');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [formId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    if (!formId) return;
    setIsExporting(true);
    try {
      await responsesApi.exportCSV(formId);
      toast.success('CSV exported successfully!');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!form || !analytics) return null;

  const questionOrder = form.schema.order;
  const questionTitles: Record<string, string> = {};
  questionOrder.forEach((qid) => {
    const q = form.schema.questions[qid];
    if (q && q.type !== 'section_break') questionTitles[qid] = q.title;
  });

  const dailyData = analytics.daily_responses.map((d) => ({
    date: (() => {
      try { return format(new Date(d.date), 'MMM d'); } catch { return d.date; }
    })(),
    responses: d.count,
  }));

  // Build chart data for choice questions
  const choiceQuestions = questionOrder
    .map((qid) => form.schema.questions[qid])
    .filter((q) => q && ['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type));

  const ratingQuestions = questionOrder
    .map((qid) => form.schema.questions[qid])
    .filter((q) => q && q.type === 'rating');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{form.title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Analytics & Responses</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/builder/${formId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Form
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || analytics.total_responses === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total Responses"
            value={analytics.total_responses.toString()}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            }
            color="blue"
          />
          <StatCard
            label="This Week"
            value={analytics.daily_responses.slice(-7).reduce((s, d) => s + d.count, 0).toString()}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="green"
          />
          <StatCard
            label="Status"
            value={form.is_published ? 'Published' : 'Draft'}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color={form.is_published ? 'green' : 'gray'}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {(['overview', 'responses'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Daily responses chart */}
            {dailyData.length > 0 && (
              <ChartCard title="Daily Responses">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: 8, color: '#F9FAFB' }}
                    />
                    <Line type="monotone" dataKey="responses" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Per-question charts */}
            {choiceQuestions.map((question) => {
              if (!question) return null;
              const stats = analytics.question_stats[question.id];
              if (!stats) return null;
              const data = Object.entries(stats.counts).map(([name, value]) => ({ name, value }));
              if (data.length === 0) return null;

              return (
                <div key={question.id} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard title={question.title} subtitle={`${stats.total} responses`}>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: 8, color: '#F9FAFB' }}
                        />
                        <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                          {data.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Distribution">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                          {data.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              );
            })}

            {/* Rating questions */}
            {ratingQuestions.map((question) => {
              if (!question) return null;
              const stats = analytics.question_stats[question.id];
              if (!stats) return null;
              const data = Object.entries(stats.counts)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([name, value]) => ({ name: `★ ${name}`, value }));

              return (
                <ChartCard key={question.id} title={question.title} subtitle={`${stats.total} responses`}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: 8, color: '#F9FAFB' }} />
                      <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              );
            })}

            {analytics.total_responses === 0 && (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-medium text-gray-600 dark:text-gray-300">No responses yet</p>
                <p className="text-sm mt-1">Share your form to start collecting responses.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'responses' && (
          <ResponsesTable
            formId={formId!}
            questionOrder={questionOrder}
            questionTitles={questionTitles}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'gray';
}) {
  const colorMap = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
