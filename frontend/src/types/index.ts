export type QuestionType =
  | 'short_answer'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'date'
  | 'file_upload'
  | 'rating'
  | 'section_break';

export interface ValidationRule {
  type: 'min_length' | 'max_length' | 'min_value' | 'max_value' | 'regex' | 'email' | 'url';
  value?: string | number;
  message?: string;
}

export interface ConditionalLogic {
  sourceQuestionId: string;
  condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
  action: 'show' | 'hide' | 'jump_to';
  targetQuestionId?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  validation?: ValidationRule[];
  logic?: ConditionalLogic[];
  placeholder?: string;
  maxRating?: number;
  ratingLabelMin?: string;
  ratingLabelMax?: string;
  allowMultiple?: boolean;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  randomizeOptions?: boolean;
}

export interface FormSchema {
  questions: Record<string, Question>;
  order: string[];
}

export interface FormSettings {
  collect_email?: boolean;
  allow_multiple_submissions?: boolean;
  show_progress_bar?: boolean;
  password_protected?: boolean;
  form_password?: string;
  response_limit?: number;
  close_date?: string;
  confirmation_message?: string;
  redirect_url?: string;
  email_notifications?: boolean;
  notification_email?: string;
  accept_responses?: boolean;
  time_limit?: number; // seconds
}

export interface FormTheme {
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  headerImage?: string;
}

export interface Form {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  schema: FormSchema;
  settings: FormSettings;
  theme: FormTheme;
  is_published: boolean;
  is_closed: boolean;
  slug: string;
  response_count: number;
  created_at: string;
  updated_at: string;
}

export interface FormListItem {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  is_closed: boolean;
  slug: string;
  response_count: number;
  folder_id: string | null;
  folder_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
}

export interface Response {
  id: string;
  form_id: string;
  respondent_email: string | null;
  answers: Record<string, string | string[] | number>;
  ip_address: string | null;
  submitted_at: string;
}

export interface Analytics {
  total_responses: number;
  total_views?: number;
  daily_responses: { date: string; count: number }[];
  question_stats: Record<string, {
    counts: Record<string, number>;
    total: number;
  }>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
