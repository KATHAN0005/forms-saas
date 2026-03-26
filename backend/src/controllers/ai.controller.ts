import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface AIGeneratedQuestion {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  maxRating?: number;
  placeholder?: string;
}

interface AIGeneratedForm {
  title: string;
  description: string;
  schema: {
    questions: Record<string, AIGeneratedQuestion>;
    order: string[];
  };
}

// Rule-based AI form generator (no external API needed)
function generateFormFromPrompt(prompt: string): AIGeneratedForm {
  const lower = prompt.toLowerCase();

  // Detect form category
  const isFeedback = /feedback|review|rate|satisfaction|opinion|experience/.test(lower);
  const isSurvey = /survey|poll|research|study|questionnaire/.test(lower);
  const isRegistration = /register|signup|sign up|enroll|enrollment|event/.test(lower);
  const isContact = /contact|reach|inquiry|support|help/.test(lower);
  const isJob = /job|application|hiring|apply|resume|position|career/.test(lower);
  const isOrder = /order|purchase|buy|product|service request/.test(lower);
  const isQuiz = /quiz|test|exam|assessment|knowledge|trivia/.test(lower);

  const questions: AIGeneratedQuestion[] = [];
  const addQ = (q: Omit<AIGeneratedQuestion, 'id'>) => {
    questions.push({ id: uuidv4(), ...q });
  };

  let title = 'Untitled Form';
  let description = 'Please fill out this form.';

  if (isFeedback) {
    title = 'Feedback Form';
    description = 'We value your feedback. Please take a moment to share your thoughts.';
    addQ({ type: 'rating', title: 'Overall, how satisfied are you?', required: true, maxRating: 5 });
    addQ({ type: 'multiple_choice', title: 'What did you like most?', required: true, options: ['User Interface', 'Performance', 'Features', 'Customer Support', 'Value for Money'] });
    addQ({ type: 'multiple_choice', title: 'How would you rate the ease of use?', required: true, options: ['Very Easy', 'Easy', 'Neutral', 'Difficult', 'Very Difficult'] });
    addQ({ type: 'paragraph', title: 'What can we improve?', required: false, placeholder: 'Share your suggestions...' });
    addQ({ type: 'multiple_choice', title: 'Would you recommend us to others?', required: true, options: ['Definitely Yes', 'Probably Yes', 'Not Sure', 'Probably Not', 'Definitely Not'] });
    addQ({ type: 'short_answer', title: 'Any other comments?', required: false, placeholder: 'Optional...' });
  } else if (isSurvey) {
    title = 'Survey Form';
    description = 'Thank you for participating in our survey. Your responses are anonymous.';
    addQ({ type: 'multiple_choice', title: 'What is your age group?', required: true, options: ['Under 18', '18–24', '25–34', '35–44', '45–54', '55+'] });
    addQ({ type: 'multiple_choice', title: 'What is your gender?', required: false, options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] });
    addQ({ type: 'checkboxes', title: 'Which of the following applies to you?', required: true, options: ['Student', 'Employed', 'Self-employed', 'Unemployed', 'Retired'] });
    addQ({ type: 'rating', title: 'How would you rate your current experience?', required: true, maxRating: 10 });
    addQ({ type: 'paragraph', title: 'Please elaborate on your selection above', required: false, placeholder: 'Your thoughts...' });
    addQ({ type: 'multiple_choice', title: 'How did you hear about us?', required: true, options: ['Social Media', 'Search Engine', 'Friend/Referral', 'Advertisement', 'Other'] });
  } else if (isRegistration) {
    title = 'Event Registration Form';
    description = 'Please complete this form to register for the event.';
    addQ({ type: 'short_answer', title: 'Full Name', required: true, placeholder: 'Your full name' });
    addQ({ type: 'short_answer', title: 'Email Address', required: true, placeholder: 'you@example.com' });
    addQ({ type: 'short_answer', title: 'Phone Number', required: false, placeholder: '+1 234 567 8900' });
    addQ({ type: 'multiple_choice', title: 'Which session will you attend?', required: true, options: ['Morning Session (9am–12pm)', 'Afternoon Session (2pm–5pm)', 'Full Day', 'Virtual Attendance'] });
    addQ({ type: 'checkboxes', title: 'Dietary preferences', required: false, options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'No preference'] });
    addQ({ type: 'short_answer', title: 'Company/Organization (optional)', required: false, placeholder: 'Where you work' });
    addQ({ type: 'paragraph', title: 'Any special requirements or questions?', required: false, placeholder: 'Let us know...' });
  } else if (isContact) {
    title = 'Contact Us';
    description = 'Fill out this form and we will get back to you shortly.';
    addQ({ type: 'short_answer', title: 'Your Name', required: true, placeholder: 'Full name' });
    addQ({ type: 'short_answer', title: 'Email Address', required: true, placeholder: 'you@example.com' });
    addQ({ type: 'short_answer', title: 'Phone Number', required: false, placeholder: 'Optional' });
    addQ({ type: 'multiple_choice', title: 'Subject', required: true, options: ['General Inquiry', 'Technical Support', 'Billing', 'Partnership', 'Other'] });
    addQ({ type: 'paragraph', title: 'Your Message', required: true, placeholder: 'Describe your issue or question in detail...' });
    addQ({ type: 'multiple_choice', title: 'Preferred contact method', required: true, options: ['Email', 'Phone', 'Either'] });
  } else if (isJob) {
    title = 'Job Application Form';
    description = 'Thank you for your interest. Please complete all required fields.';
    addQ({ type: 'short_answer', title: 'Full Name', required: true, placeholder: 'Your legal full name' });
    addQ({ type: 'short_answer', title: 'Email Address', required: true, placeholder: 'Professional email' });
    addQ({ type: 'short_answer', title: 'Phone Number', required: true, placeholder: 'Best number to reach you' });
    addQ({ type: 'short_answer', title: 'LinkedIn Profile URL', required: false, placeholder: 'https://linkedin.com/in/...' });
    addQ({ type: 'multiple_choice', title: 'Position Applied For', required: true, options: ['Software Engineer', 'Product Manager', 'Designer', 'Marketing', 'Sales', 'Other'] });
    addQ({ type: 'multiple_choice', title: 'Years of Experience', required: true, options: ['0–1 years', '1–3 years', '3–5 years', '5–10 years', '10+ years'] });
    addQ({ type: 'paragraph', title: 'Cover Letter / Why do you want this role?', required: true, placeholder: 'Tell us about yourself and why you are a great fit...' });
    addQ({ type: 'file_upload', title: 'Upload Resume/CV', required: true });
    addQ({ type: 'date', title: 'Earliest Start Date', required: true });
    addQ({ type: 'multiple_choice', title: 'Work arrangement preference', required: true, options: ['On-site', 'Remote', 'Hybrid'] });
  } else if (isOrder) {
    title = 'Order / Service Request Form';
    description = 'Complete this form to place your order or service request.';
    addQ({ type: 'short_answer', title: 'Full Name', required: true, placeholder: 'Billing name' });
    addQ({ type: 'short_answer', title: 'Email Address', required: true, placeholder: 'Order confirmation will be sent here' });
    addQ({ type: 'short_answer', title: 'Phone Number', required: true, placeholder: 'Contact number' });
    addQ({ type: 'paragraph', title: 'Delivery Address', required: true, placeholder: 'Full shipping address including postal code' });
    addQ({ type: 'multiple_choice', title: 'Preferred delivery time', required: true, options: ['Morning (8am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–9pm)', 'Any time'] });
    addQ({ type: 'paragraph', title: 'Special instructions', required: false, placeholder: 'Any special notes for your order...' });
  } else if (isQuiz) {
    title = 'Knowledge Quiz';
    description = 'Test your knowledge! Answer all questions to the best of your ability.';
    addQ({ type: 'short_answer', title: 'Your Name', required: true, placeholder: 'Enter your name' });
    addQ({ type: 'short_answer', title: 'Email Address', required: true, placeholder: 'For sending results' });
    addQ({ type: 'multiple_choice', title: 'Question 1: Which of the following is correct?', required: true, options: ['Option A', 'Option B', 'Option C', 'Option D'] });
    addQ({ type: 'multiple_choice', title: 'Question 2: Select the best answer', required: true, options: ['Option A', 'Option B', 'Option C', 'Option D'] });
    addQ({ type: 'multiple_choice', title: 'Question 3: True or False?', required: true, options: ['True', 'False'] });
    addQ({ type: 'short_answer', title: 'Question 4: Short answer question', required: true, placeholder: 'Your answer...' });
    addQ({ type: 'rating', title: 'How difficult was this quiz?', required: false, maxRating: 5 });
  } else {
    // Generic form
    title = extractTitle(prompt);
    description = `Please complete all required fields in this form.`;
    addQ({ type: 'short_answer', title: 'Full Name', required: true, placeholder: 'Enter your full name' });
    addQ({ type: 'short_answer', title: 'Email Address', required: true, placeholder: 'your@email.com' });
    addQ({ type: 'paragraph', title: 'Additional Comments', required: false, placeholder: 'Any additional information...' });
    addQ({ type: 'rating', title: 'Overall Experience', required: false, maxRating: 5 });
  }

  const schema = {
    questions: {} as Record<string, AIGeneratedQuestion>,
    order: [] as string[],
  };

  for (const q of questions) {
    schema.questions[q.id] = q;
    schema.order.push(q.id);
  }

  return { title, description, schema };
}

function extractTitle(prompt: string): string {
  const words = prompt.split(/\s+/).slice(0, 6).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export async function generateForm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return next(createError('A valid prompt is required', 400, 'INVALID_PROMPT'));
    }
    if (prompt.length > 500) {
      return next(createError('Prompt must be 500 characters or fewer', 400, 'PROMPT_TOO_LONG'));
    }

    logger.info(`AI form generation requested by user ${req.user!.id}: "${prompt.substring(0, 80)}"`);

    const result = generateFormFromPrompt(prompt.trim());

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
