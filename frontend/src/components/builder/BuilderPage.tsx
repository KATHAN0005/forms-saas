import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { formsApi } from '@/api/forms';
import { useBuilderStore } from '@/store/builderStore';
import { QuestionTypePanel } from './QuestionTypePanel';
import { QuestionCard } from './QuestionCard';
import { QuestionEditor } from './QuestionEditor';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';

const AUTO_SAVE_INTERVAL = 30_000;

type RightPanelTab = 'questions' | 'settings' | 'theme';

const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Default (Inter)' },
  { value: 'Georgia, serif', label: 'Serif' },
  { value: 'Menlo, monospace', label: 'Monospace' },
  { value: 'system-ui, sans-serif', label: 'Sans-serif' },
];

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer py-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none',
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5',
            checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}

export function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    formId,
    title,
    description,
    schema,
    settings,
    theme,
    isPublished,
    isSaving,
    isDirty,
    initForm,
    setTitle,
    selectQuestion,
    selectedQuestionId,
    deleteQuestion,
    duplicateQuestion,
    updateQuestion,
    reorderQuestions,
    undo,
    redo,
    canUndo,
    canRedo,
    setSaving,
    markClean,
    activePanel,
    setActivePanel,
    setSettings,
    setTheme,
  } = useBuilderStore();

  const [rightTab, setRightTab] = useState<RightPanelTab>('questions');
  const [formSlug, setFormSlug] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load form
  useEffect(() => {
    if (!id) return;
    formsApi.get(id).then((form) => {
      initForm(form);
      setFormSlug(form.slug);
    }).catch(() => {
      toast.error('Failed to load form');
      navigate('/dashboard');
    });
  }, [id, initForm, navigate]);

  // Keep rightTab in sync with activePanel from store
  useEffect(() => {
    if (activePanel === 'settings') setRightTab('settings');
    else if (activePanel === 'theme') setRightTab('theme');
  }, [activePanel]);

  const save = useCallback(async () => {
    if (!formId || !isDirty) return;
    setSaving(true);
    try {
      await formsApi.update(formId, { title, description, schema, settings, theme, is_published: isPublished });
      markClean();
    } catch {
      toast.error('Failed to save form');
    } finally {
      setSaving(false);
    }
  }, [formId, isDirty, title, description, schema, settings, theme, isPublished, setSaving, markClean]);

  // Auto-save every 30s
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (isDirty) save();
    }, AUTO_SAVE_INTERVAL);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [isDirty, save]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (ctrl && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (ctrl && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        redo();
        return;
      }
      if (ctrl && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
        return;
      }
      if (!isInput) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedQuestionId) {
          deleteQuestion(selectedQuestionId);
          return;
        }
        if (e.key === 'Escape') {
          selectQuestion(null);
          return;
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuestionId, isDirty, formId]);

  const handleSave = async () => {
    await save();
    toast.success('Saved!');
  };

  const handlePublishToggle = async () => {
    if (!formId) return;
    setSaving(true);
    try {
      await formsApi.update(formId, { is_published: !isPublished });
      const updated = await formsApi.get(formId);
      initForm(updated);
      toast.success(isPublished ? 'Form unpublished' : 'Form published!');
    } catch {
      toast.error('Failed to update publish status');
    } finally {
      setSaving(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = schema.order.indexOf(active.id as string);
    const toIndex = schema.order.indexOf(over.id as string);
    reorderQuestions(fromIndex, toIndex);
  };

  const handleTabChange = (tab: RightPanelTab) => {
    setRightTab(tab);
    if (tab === 'settings') setActivePanel('settings');
    else if (tab === 'theme') setActivePanel('theme');
    else setActivePanel('questions');
  };

  if (!formId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const orderedQuestions = schema.order.map((qid) => schema.questions[qid]).filter(Boolean);
  const questionCount = orderedQuestions.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          {/* Back / breadcrumb */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
            title="Back to dashboard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline text-gray-400 dark:text-gray-500">Dashboard</span>
          </button>
          <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">/</span>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 min-w-0 max-w-xs"
            placeholder="Form title..."
          />

          {/* Question count badge */}
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {questionCount} question{questionCount !== 1 ? 's' : ''}
          </span>

          {isDirty && (
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:inline">Unsaved changes</span>
          )}
          {isSaving && (
            <span className="text-xs text-blue-500 flex items-center gap-1">
              <Spinner size="sm" className="w-3 h-3" />
              Saving...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo()}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            title="Redo (Ctrl+Shift+Z)"
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />

          {/* Preview */}
          <a
            href={formSlug ? `/form/${formSlug}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </a>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            title="Save (Ctrl+S)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>

          {/* Publish toggle */}
          <button
            onClick={handlePublishToggle}
            disabled={isSaving}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50',
              isPublished
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                : 'bg-blue-600 hover:bg-blue-700 text-white',
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPublished ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
            </svg>
            {isPublished ? 'Published' : 'Publish'}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Question type panel */}
        <QuestionTypePanel />

        {/* Center: Canvas */}
        <main
          className="flex-1 overflow-y-auto p-6"
          onClick={() => selectQuestion(null)}
        >
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Form header preview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-6 mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{title}</h1>
              {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
              )}
            </div>

            {orderedQuestions.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                }
                title="No questions yet"
                description="Click a question type from the left panel to add your first question."
              />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={schema.order}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedQuestions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      isSelected={selectedQuestionId === question.id}
                      onSelect={() => selectQuestion(question.id)}
                      onDelete={() => deleteQuestion(question.id)}
                      onDuplicate={() => duplicateQuestion(question.id)}
                      onToggleRequired={() =>
                        updateQuestion(question.id, { required: !question.required })
                      }
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </main>

        {/* Right: Tabbed panel */}
        <aside className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Tab buttons */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            {(['questions', 'settings', 'theme'] as RightPanelTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={cn(
                  'flex-1 py-3 text-xs font-medium capitalize transition-colors',
                  rightTab === tab
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                )}
              >
                {tab === 'questions' ? 'Edit' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {rightTab === 'questions' && (
              selectedQuestionId ? (
                <QuestionEditor />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                  <div className="text-3xl mb-3">👈</div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Select a question to edit</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Click any question in the canvas to edit its properties.
                  </p>
                </div>
              )
            )}

            {rightTab === 'settings' && (
              <div className="p-4 space-y-1">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Form Settings
                </h3>

                <ToggleRow
                  label="Collect email address"
                  checked={!!settings.collect_email}
                  onChange={(v) => setSettings({ collect_email: v })}
                />
                <ToggleRow
                  label="Allow multiple submissions"
                  checked={!!settings.allow_multiple_submissions}
                  onChange={(v) => setSettings({ allow_multiple_submissions: v })}
                />
                <ToggleRow
                  label="Show progress bar"
                  checked={!!settings.show_progress_bar}
                  onChange={(v) => setSettings({ show_progress_bar: v })}
                />
                <ToggleRow
                  label="Accept responses"
                  checked={settings.accept_responses !== false}
                  onChange={(v) => setSettings({ accept_responses: v })}
                />

                <div className="pt-2">
                  <ToggleRow
                    label="Password protect"
                    checked={!!settings.password_protected}
                    onChange={(v) => setSettings({ password_protected: v })}
                  />
                  {settings.password_protected && (
                    <input
                      type="text"
                      value={settings.form_password ?? ''}
                      onChange={(e) => setSettings({ form_password: e.target.value })}
                      placeholder="Enter password"
                      className="w-full mt-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                <div className="pt-3 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                      Response limit (optional)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={settings.response_limit ?? ''}
                      onChange={(e) => setSettings({ response_limit: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Unlimited"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                      Confirmation message
                    </label>
                    <textarea
                      rows={3}
                      value={settings.confirmation_message ?? ''}
                      onChange={(e) => setSettings({ confirmation_message: e.target.value })}
                      placeholder="Thank you for your response!"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                      Redirect URL after submission
                    </label>
                    <input
                      type="url"
                      value={settings.redirect_url ?? ''}
                      onChange={(e) => setSettings({ redirect_url: e.target.value })}
                      placeholder="https://example.com/thank-you"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'theme' && (
              <div className="p-4 space-y-4">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Form Theme
                </h3>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.primaryColor ?? '#2563EB'}
                      onChange={(e) => setTheme({ primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={theme.primaryColor ?? '#2563EB'}
                      onChange={(e) => setTheme({ primaryColor: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    Background Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.backgroundColor ?? '#F9FAFB'}
                      onChange={(e) => setTheme({ backgroundColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={theme.backgroundColor ?? '#F9FAFB'}
                      onChange={(e) => setTheme({ backgroundColor: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                    Font Family
                  </label>
                  <select
                    value={theme.fontFamily ?? FONT_OPTIONS[0].value}
                    onChange={(e) => setTheme({ fontFamily: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FONT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
