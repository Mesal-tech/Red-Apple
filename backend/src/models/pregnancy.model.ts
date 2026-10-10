export interface KickSession {
  id: string;
  user_id: string;
  kick_count: number;
  duration_minutes: number;
  recorded_at: string;
  notes?: string;
}

export interface ContractionLog {
  id: string;
  user_id: string;
  start_time: string;
  duration_seconds: number;
  frequency_minutes?: number;
  intensity?: 'mild' | 'moderate' | 'strong';
  recorded_at: string;
}

export interface PregnancyStatus {
  active: boolean;
  conception_date?: string;
  lmp_date?: string;
  current_week: number;
  current_day_in_week: number;
  trimester: 1 | 2 | 3;
  estimated_due_date: string;
  days_until_due_date: number;
  baby_size_comparison: string;
  fetal_length_cm: number;
  fetal_weight_grams: number;
  weekly_milestone_title: string;
  weekly_milestone_description: string;
  next_antenatal_visit_recommendation: string;
}
