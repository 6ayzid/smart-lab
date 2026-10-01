export type ItemType = "likert" | "open_text";

export interface ResponseOption {
  id: number;
  label: string;
}

export interface SurveyItem {
  id: string;
  prompt: string;
  type: ItemType;
  options?: ResponseOption[];
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  items: SurveyItem[];
}

export const DEFAULT_LIKERT_OPTIONS: ResponseOption[] = [
  { id: 1, label: "Strongly disagree" },
  { id: 2, label: "Disagree" },
  { id: 3, label: "Neutral" },
  { id: 4, label: "Agree" },
  { id: 5, label: "Strongly agree" },
];

export const defaultSurvey: Survey = {
  id: "psychometric-core-v1",
  title: "Usability & Cognitive Clarity Study",
  description: "Standardized psychometric questionnaire evaluating interface usability, cognitive load, and visual presentation.",
  items: [
    {
      id: "item_1",
      prompt: "The layout and visual hierarchy are clear and easy to navigate.",
      type: "likert",
      options: DEFAULT_LIKERT_OPTIONS,
    },
    {
      id: "item_2",
      prompt: "The interface provides sufficient feedback for actions without causing confusion.",
      type: "likert",
      options: DEFAULT_LIKERT_OPTIONS,
    },
    {
      id: "item_3",
      prompt: "I was able to focus on my task without feeling overloaded by visual distractions.",
      type: "likert",
      options: DEFAULT_LIKERT_OPTIONS,
    },
    {
      id: "item_4",
      prompt: "The interaction flow and transitions felt natural and responsive.",
      type: "likert",
      options: DEFAULT_LIKERT_OPTIONS,
    },
    {
      id: "item_5",
      prompt: "I felt comfortable understanding and making decisions at my own pace.",
      type: "likert",
      options: DEFAULT_LIKERT_OPTIONS,
    },
    {
      id: "item_6",
      prompt: "Please share any additional observations, suggestions, or reflections regarding your experience.",
      type: "open_text",
    },
  ],
};
