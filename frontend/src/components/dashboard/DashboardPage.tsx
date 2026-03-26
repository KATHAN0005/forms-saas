import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { formsApi } from '@/api/forms';
import { userApi } from '@/api/user';
import { useAuthStore } from '@/store/authStore';
import { FormCard } from './FormCard';
import { CreateFormModal } from './CreateFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { DashboardSkeleton, TableRowSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/utils/cn';
import type { FormListItem, Folder } from '@/types';

const LIMIT = 12;

type SortMode = 'updated_desc' | 'name_asc' | 'name_desc' | 'responses_desc';
type ViewMode = 'grid' | 'list';

const SORT_LABELS: Record<SortMode, string> = {
  updated_desc: 'Last Modified',
  name_asc: 'Name A–Z',
  name_desc: 'Name Z–A',
  responses_desc: 'Most Responses',
};

function sortForms(forms: FormListItem[], mode: SortMode): FormListItem[] {
  const sorted = [...forms];
  switch (mode) {
    case 'updated_desc':
      return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    case 'name_asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'name_desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case 'responses_desc':
      return sorted.sort((a, b) => b.response_count - a.response_count);
  }
}

const TEMPLATES = [
  { emoji: '📋', title: 'Feedback Form', description: 'Collect product feedback' },
  { emoji: '📬', title: 'Contact Form', description: 'Simple contact form' },
  { emoji: '💼', title: 'Job Application', description: 'Hiring form with skills' },
  { emoji: '🎉', title: 'Event Registration', description: 'Register attendees' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [forms, setForms] = useState<FormListItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<FormListItem | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);
  const [shareUrlCopied, setShareUrlCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('updated_desc');
  const [stats, setStats] = useState<{ total_forms: number; total_responses: number; published_forms: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const loadForms = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await formsApi.list({
        search: search || undefined,
        folder_id: selectedFolder,
        page,
        limit: LIMIT,
      });
      setForms(result.forms);
      setTotal(result.total);
    } catch {
      toast.error('Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedFolder, page]);

  const loadFolders = useCallback(async () => {
    try {
      const result = await formsApi.getFolders();
      setFolders(result);
    } catch {
      // Silently fail for folders
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await userApi.getStats();
      setStats(result);
    } catch {
      // silently fail
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
    loadStats();
  }, [loadFolders, loadStats]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await formsApi.delete(deleteTarget);
      toast.success('Form deleted');
      setDeleteTarget(null);
      loadForms();
      loadStats();
    } catch {
      toast.error('Failed to delete form');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const newForm = await formsApi.duplicate(id);
      toast.success('Form duplicated');
      navigate(`/builder/${newForm.id}`);
    } catch {
      toast.error('Failed to duplicate form');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await formsApi.createFolder({ name: newFolderName.trim() });
      setNewFolderName('');
      setShowFolderInput(false);
      loadFolders();
      toast.success('Folder created');
    } catch {
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      await formsApi.deleteFolder(deleteFolderTarget);
      if (selectedFolder === deleteFolderTarget) setSelectedFolder(undefined);
      setDeleteFolderTarget(null);
      loadFolders();
      loadForms();
      toast.success('Folder deleted');
    } catch {
      toast.error('Failed to delete folder');
    }
  };

  const handleFolderColorChange = async (folderId: string, color: string) => {
    try {
      await formsApi.updateFolder(folderId, { color });
      loadFolders();
    } catch {
      toast.error('Failed to update folder color');
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareTarget) return;
    const url = `${window.location.origin}/form/${shareTarget.slug}`;
    await navigator.clipboard.writeText(url);
    setShareUrlCopied(true);
    setTimeout(() => setShareUrlCopied(false), 2000);
  };

  const handleUseTemplate = async (templateTitle: string) => {
    try {
      const newForm = await formsApi.create({ title: templateTitle });
      navigate(`/builder/${newForm.id}`);
    } catch {
      toast.error('Failed to create form from template');
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const result = await formsApi.generateFromAI(aiPrompt.trim());
      const newForm = await formsApi.create({ title: result.title, description: result.description });
      toast.success('Form generated!');
      setShowAIModal(false);
      setAiPrompt('');
      navigate(`/builder/${newForm.id}`);
    } catch {
      toast.error('Failed to generate form');
    } finally {
      setAiGenerating(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const displayedForms = sortForms(forms, sortMode);

  return (
    <PageLayout title="Dashboard">
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-[calc(100vh-56px)]">
          <nav className="flex-1 p-3 overflow-y-auto">
            {/* All Forms */}
            <button
              onClick={() => { setSelectedFolder(undefined); setPage(1); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-1',
                selectedFolder === undefined
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              All Forms
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{total}</span>
            </button>

            {/* Folders section */}
            <div className="mt-4 mb-2">
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Folders
                </span>
                <button
                  onClick={() => setShowFolderInput(true)}
                  title="New folder"
                  className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {showFolderInput && (
                <div className="px-2 mb-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') { setShowFolderInput(false); setNewFolderName(''); }
                    }}
                    placeholder="Folder name"
                    autoFocus
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-1 mt-1">
                    <button onClick={handleCreateFolder} className="flex-1 text-xs py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                    <button onClick={() => { setShowFolderInput(false); setNewFolderName(''); }} className="flex-1 text-xs py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                  </div>
                </div>
              )}

              {folders.map((folder) => {
                const folderFormCount = forms.filter((f) => f.folder_id === folder.id).length;
                return (
                  <div key={folder.id} className="group relative">
                    <button
                      onClick={() => { setSelectedFolder(folder.id); setPage(1); }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                        selectedFolder === folder.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                      )}
                    >
                      <label
                        className="relative flex-shrink-0 cursor-pointer"
                        title="Change folder color"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className="block w-3 h-3 rounded-full border border-white dark:border-gray-700 shadow-sm"
                          style={{ backgroundColor: folder.color || '#6B7280' }}
                        />
                        <input
                          type="color"
                          value={folder.color || '#6B7280'}
                          onChange={(e) => handleFolderColorChange(folder.id, e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                      </label>
                      <span className="truncate">{folder.name}</span>
                      <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{folderFormCount}</span>
                    </button>
                    <button
                      onClick={() => setDeleteFolderTarget(folder.id)}
                      title="Delete folder"
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              Signed in as{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{user?.name}</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          {/* Stats bar */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
            <div className="flex flex-wrap items-center gap-6">
              {statsLoading ? (
                <>
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="h-10 w-28" />
                </>
              ) : stats ? (
                <>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_forms}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Forms</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.published_forms}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Published</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_responses}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Responses</p>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="p-6">
            {/* Template strip */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Quick Start Templates
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.title}
                    onClick={() => handleUseTemplate(tpl.title)}
                    className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
                  >
                    <span className="text-2xl">{tpl.emoji}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white text-center">{tpl.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-0.5">{tpl.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedFolder === undefined
                    ? 'All Forms'
                    : folders.find((f) => f.id === selectedFolder)?.name ?? 'Forms'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {total} form{total !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search forms..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  />
                </div>

                {/* Sort */}
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(Object.keys(SORT_LABELS) as SortMode[]).map((key) => (
                    <option key={key} value={key}>{SORT_LABELS[key]}</option>
                  ))}
                </select>

                {/* View toggle */}
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                    className={cn(
                      'p-1.5 transition-colors',
                      viewMode === 'grid'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    title="List view"
                    className={cn(
                      'p-1.5 transition-colors',
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>

                {/* AI Generate */}
                <button
                  onClick={() => setShowAIModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all shadow-sm"
                >
                  ✨ Generate with AI
                </button>

                {/* Create Form */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Form
                </button>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <DashboardSkeleton />
            ) : displayedForms.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                title={search ? 'No forms found' : 'No forms yet'}
                description={
                  search
                    ? `No forms match "${search}". Try a different search.`
                    : 'Create your first form to start collecting responses.'
                }
                action={
                  !search ? (
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first form
                      </button>
                      <button
                        onClick={() => setShowAIModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        ✨ Generate with AI
                      </button>
                    </div>
                  ) : undefined
                }
              />
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayedForms.map((form) => (
                    <FormCard
                      key={form.id}
                      form={form}
                      onEdit={(id) => navigate(`/builder/${id}`)}
                      onDelete={(id) => setDeleteTarget(id)}
                      onDuplicate={handleDuplicate}
                      onShare={(f) => setShareTarget(f)}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
                )}
              </>
            ) : (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Responses</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Updated</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {displayedForms.map((form) => (
                        <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => navigate(`/builder/${form.id}`)}
                              className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left"
                            >
                              {form.title}
                            </button>
                            {form.description && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs mt-0.5">
                                {form.description}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              form.is_published
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
                            )}>
                              {form.is_published ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {form.response_count}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                            {new Date(form.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => navigate(`/builder/${form.id}`)}
                                title="Edit"
                                className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setShareTarget(form)}
                                title="Share"
                                className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeleteTarget(form.id)}
                                title="Delete"
                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <PaginationBar page={page} totalPages={totalPages} setPage={setPage} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <CreateFormModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); loadForms(); loadStats(); }}
        folders={folders}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete form"
        message="Are you sure you want to delete this form? This action cannot be undone and all responses will be lost."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
        confirmVariant="danger"
      />

      <ConfirmDialog
        isOpen={!!deleteFolderTarget}
        title="Delete folder"
        message="Are you sure you want to delete this folder? Forms inside will not be deleted."
        onConfirm={handleDeleteFolder}
        onCancel={() => setDeleteFolderTarget(null)}
        confirmText="Delete folder"
        confirmVariant="danger"
      />

      {/* Share Modal with QR Code */}
      {shareTarget && (
        <Modal
          isOpen={!!shareTarget}
          title="Share form"
          onClose={() => setShareTarget(null)}
          footer={
            <button
              onClick={() => setShareTarget(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          }
        >
          <div className="space-y-4">
            {!shareTarget.is_published && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                This form is not published yet. Publish it in the builder to accept responses.
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Share this link with respondents to collect responses.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/form/${shareTarget.slug}`}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
              />
              <button
                onClick={handleCopyShareLink}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex-shrink-0"
              >
                {shareUrlCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex justify-center pt-2">
              <QRCodeSVG
                value={`${window.location.origin}/form/${shareTarget.slug}`}
                size={180}
                className="rounded-lg"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* AI Generate Modal */}
      <Modal
        isOpen={showAIModal}
        title="✨ Generate Form with AI"
        onClose={() => { setShowAIModal(false); setAiPrompt(''); }}
        footer={
          <>
            <button
              onClick={() => { setShowAIModal(false); setAiPrompt(''); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAIGenerate}
              disabled={!aiPrompt.trim() || aiGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
            >
              {aiGenerating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                '✨ Generate'
              )}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Describe the form you want to create and AI will generate it for you.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. A customer satisfaction survey for a SaaS product with questions about ease of use, support quality, and NPS score."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </Modal>
    </PageLayout>
  );
}

function PaginationBar({
  page,
  totalPages,
  setPage,
}: {
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => setPage(p)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-lg transition-colors',
            p === page
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => setPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  );
}
