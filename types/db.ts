export type Tenant = {
  id: string;
  name: string;
  type: 'parent' | 'service' | 'product';
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'operator' | 'contractor' | null;
  created_at: string;
};

export type Task = {
  id: string;
  tenant_id: string;
  monday_item_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  estimated_minutes: number;
  ai_mode: 'HUMAN_ONLY' | 'AI_ASSIST' | 'AI_DRAFT' | 'AI_EXECUTE' | null;
  blocker_flag: boolean;
  blocker_reason: string | null;
  blocked_by_task_id: string | null;
  owner_user_id: string | null;
  revenue_impact_score: number;
  urgency_score: number;
  created_at: string;
};

export type Lead = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'QUOTED' | 'WON' | 'LOST';
  assigned_user_id: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  revenue_potential: number | null;
  created_at: string;
};

export type Activity = {
  id: string;
  tenant_id: string;
  object_type: 'task' | 'lead';
  object_id: string;
  user_id: string | null;
  type: string;
  summary: string | null;
  created_at: string;
};

export type DailyPlan = {
  id: string;
  date: string;
  user_id: string;
  critical_now: Task[];
  money_moves: Task[];
  quick_wins: Task[];
  coming_up: Task[];
  deep_work: Task[];
  created_at: string;
};

export type DailyBrief = {
  id: string;
  date: string;
  summary: {
    headline: string;
    top_3: string[];
    warnings: string[];
    next_action: string;
  };
  created_at: string;
};
