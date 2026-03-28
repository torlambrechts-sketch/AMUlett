export type SurveyType = "pulse" | "culture";

export type SurveyRow = {
  id: string;
  organization_id: string;
  survey_type: SurveyType;
  title: Record<string, string>;
  description: Record<string, string> | null;
  status: string;
  closes_at: string | null;
  anonymous: boolean;
};

export type SurveyQuestionRow = {
  id: string;
  survey_id: string;
  position: number;
  question: Record<string, string>;
  response_type: string;
  question_category: string | null;
  is_enps: boolean;
  is_psychological_safety: boolean;
  options: unknown;
};

export type DepartmentAggregate = {
  hidden: boolean;
  reason?: string;
  respondent_count?: number;
  minimum_required?: number;
  suggest_parent_id?: string | null;
  enps?: number | null;
  category_averages?: Record<string, number>;
  psychological_safety_avg?: number | null;
  psychological_safety_risk?: boolean;
};
