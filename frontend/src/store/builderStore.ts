import { create } from 'zustand';
import { generateId } from '../utils/uuid';
import { Question, QuestionType, FormSchema, FormSettings, FormTheme } from '../types';

interface HistoryState {
  schema: FormSchema;
}

interface BuilderState {
  // Form metadata
  formId: string | null;
  title: string;
  description: string;
  settings: FormSettings;
  theme: FormTheme;
  isPublished: boolean;
  isSaving: boolean;
  isDirty: boolean;

  // Schema (normalized)
  schema: FormSchema;

  // UI state
  selectedQuestionId: string | null;
  activePanel: 'questions' | 'settings' | 'theme';

  // Undo/Redo
  history: HistoryState[];
  historyIndex: number;

  // Actions
  initForm: (form: {
    id: string;
    title: string;
    description: string | null;
    schema: FormSchema;
    settings: FormSettings;
    theme: FormTheme;
    is_published: boolean;
  }) => void;

  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setSettings: (settings: Partial<FormSettings>) => void;
  setTheme: (theme: Partial<FormTheme>) => void;

  addQuestion: (type: QuestionType) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => void;
  reorderQuestions: (fromIndex: number, toIndex: number) => void;
  selectQuestion: (id: string | null) => void;
  setActivePanel: (panel: 'questions' | 'settings' | 'theme') => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setSaving: (isSaving: boolean) => void;
  markClean: () => void;
}

const MAX_HISTORY = 50;

function pushHistory(state: BuilderState, schema: FormSchema): Partial<BuilderState> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push({ schema });
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
    isDirty: true,
  };
}

const defaultQuestionProps = (type: QuestionType): Partial<Question> => {
  const base = { required: false, options: [] };
  switch (type) {
    case 'multiple_choice':
    case 'checkboxes':
    case 'dropdown':
      return { ...base, options: ['Option 1', 'Option 2'] };
    case 'rating':
      return { ...base, maxRating: 5 };
    case 'file_upload':
      return { ...base, acceptedFileTypes: [], maxFileSize: 10 };
    default:
      return base;
  }
};

export const useBuilderStore = create<BuilderState>((set, get) => ({
  formId: null,
  title: 'Untitled Form',
  description: '',
  settings: {
    collect_email: false,
    allow_multiple_submissions: false,
    show_progress_bar: true,
    confirmation_message: 'Thank you for your response!',
    accept_responses: true,
  },
  theme: { primaryColor: '#3B82F6', backgroundColor: '#ffffff' },
  isPublished: false,
  isSaving: false,
  isDirty: false,
  schema: { questions: {}, order: [] },
  selectedQuestionId: null,
  activePanel: 'questions',
  history: [],
  historyIndex: -1,

  initForm: (form) => {
    const schema = form.schema || { questions: {}, order: [] };
    set({
      formId: form.id,
      title: form.title,
      description: form.description || '',
      settings: form.settings || {},
      theme: form.theme || {},
      isPublished: form.is_published,
      schema,
      history: [{ schema }],
      historyIndex: 0,
      isDirty: false,
    });
  },

  setTitle: (title) => set({ title, isDirty: true }),
  setDescription: (description) => set({ description, isDirty: true }),
  setSettings: (settings) => set((s) => ({ settings: { ...s.settings, ...settings }, isDirty: true })),
  setTheme: (theme) => set((s) => ({ theme: { ...s.theme, ...theme }, isDirty: true })),

  addQuestion: (type) => {
    const state = get();
    const id = generateId();
    const question: Question = {
      id,
      type,
      title: type === 'section_break' ? 'Section' : 'Question',
      required: false,
      ...defaultQuestionProps(type),
    };
    const newSchema: FormSchema = {
      questions: { ...state.schema.questions, [id]: question },
      order: [...state.schema.order, id],
    };
    set((s) => ({
      schema: newSchema,
      selectedQuestionId: id,
      ...pushHistory(s, newSchema),
    }));
  },

  updateQuestion: (id, updates) => {
    const state = get();
    const question = state.schema.questions[id];
    if (!question) return;
    const updatedQuestion = { ...question, ...updates };
    const newSchema: FormSchema = {
      ...state.schema,
      questions: { ...state.schema.questions, [id]: updatedQuestion },
    };
    set((s) => ({
      schema: newSchema,
      ...pushHistory(s, newSchema),
    }));
  },

  deleteQuestion: (id) => {
    const state = get();
    const { [id]: _, ...rest } = state.schema.questions;
    const newSchema: FormSchema = {
      questions: rest,
      order: state.schema.order.filter((qid) => qid !== id),
    };
    set((s) => ({
      schema: newSchema,
      selectedQuestionId: s.selectedQuestionId === id ? null : s.selectedQuestionId,
      ...pushHistory(s, newSchema),
    }));
  },

  duplicateQuestion: (id) => {
    const state = get();
    const question = state.schema.questions[id];
    if (!question) return;
    const newId = generateId();
    const newQuestion = { ...question, id: newId };
    const idx = state.schema.order.indexOf(id);
    const newOrder = [...state.schema.order];
    newOrder.splice(idx + 1, 0, newId);
    const newSchema: FormSchema = {
      questions: { ...state.schema.questions, [newId]: newQuestion },
      order: newOrder,
    };
    set((s) => ({
      schema: newSchema,
      selectedQuestionId: newId,
      ...pushHistory(s, newSchema),
    }));
  },

  reorderQuestions: (fromIndex, toIndex) => {
    const state = get();
    const newOrder = [...state.schema.order];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    const newSchema: FormSchema = { ...state.schema, order: newOrder };
    set((s) => ({
      schema: newSchema,
      ...pushHistory(s, newSchema),
    }));
  },

  selectQuestion: (id) => set({ selectedQuestionId: id }),
  setActivePanel: (panel) => set({ activePanel: panel }),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({ schema: history[newIndex].schema, historyIndex: newIndex, isDirty: true });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({ schema: history[newIndex].schema, historyIndex: newIndex, isDirty: true });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  setSaving: (isSaving) => set({ isSaving }),
  markClean: () => set({ isDirty: false }),
}));
