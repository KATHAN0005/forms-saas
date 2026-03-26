import { useEffect, useRef, useCallback } from 'react';
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
  } = useBuilderStore();

  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoading = !formId;

  // Load form
  useEffect(() => {
    if (!id) return;
    formsApi.get(id).then((form) => {
      initForm(form);
    }).catch(() => {
      toast.error('Failed to load form');
      navigate('/dashboard');
    });
  }, [id, initForm, navigate]);

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

  const handleSave = async () => {
    await save();
    toast.success('Saved!');
  };

  const handlePublishToggle = async () => {
    if (!formId) return;
    setSaving(true);
    try {
      await formsApi.update(formId, { is_published: !isPublished });
      // Re-init to get updated state
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

  if (!formId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const orderedQuestions = schema.order.map((qid) => schema.questions[qid]).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 min-w-0 max-w-xs"
            placeholder="Form title..."
          />

          {isDirty && (
            <span className="text-xs text-gray-400 dark:text-gray-500">Unsaved changes</span>
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
            title="Undo"
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            title="Redo"
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />

          {/* Preview */}
          <a
            href={`/form/${formId}`}
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
                : 'bg-blue-600 hover:bg-blue-700 text-white'
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
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : (
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
          )}
        </main>

        {/* Right: Question editor */}
        <QuestionEditor />
      </div>
    </div>
  );
}
