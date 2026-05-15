import { supabase } from "@/integrations/supabase/client";

export async function logAdminAction(params: {
  adminEmail: string;
  actionType: string;
  targetUserId?: string | null;
  targetUsername?: string | null;
  amount?: number | null;
  levelNumber?: number | null;
  details?: Record<string, unknown>;
}) {
  await supabase.from("admin_actions_log").insert({
    admin_email: params.adminEmail,
    action_type: params.actionType,
    target_user_id: params.targetUserId ?? null,
    target_username: params.targetUsername ?? null,
    amount: params.amount ?? null,
    level_number: params.levelNumber ?? null,
    details: (params.details ?? {}) as never,
  });
}
