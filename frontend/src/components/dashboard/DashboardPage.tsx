import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formsApi } from '@/api/forms';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { FormCard } from './FormCard';
import { CreateFormModal } from './CreateFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import type { FormListItem, Folder } from '@/types';

const LIMIT = 12;

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();

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

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

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

  const handleCopyShareLink = async () => {
    if (!shareTarget) return;
    const url = `${window.location.origin}/form/${shareTarget.slug}`;
    await navigator.clipboard.writeText(url);
    setShareUrlCopied(true);
    setTimeout(() => setShareUrlCopied(false), 2000);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">Forms</span>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {/* All Forms */}
          <button
            onClick={() => { setSelectedFolder(undefined); setPage(1); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
              selectedFolder === undefined
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            All Forms
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

            {folders.map((folder) => (
              <div key={folder.id} className="group relative">
                <button
                  onClick={() => { setSelectedFolder(folder.id); setPage(1); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedFolder === folder.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: folder.color || '#6B7280' }}
                  />
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                </button>
                <button
                  onClick={() => setDeleteFolderTarget(folder.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => logout()}
              title="Sign out"
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search forms..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Form
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
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
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : forms.length === 0 ? (
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
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create your first form
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {forms.map((form) => (
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        p === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateFormModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); loadForms(); }}
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

      {/* Share Modal */}
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
            {!shareTarget.is_published && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                This form is not published yet. Publish it in the builder to accept responses.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
