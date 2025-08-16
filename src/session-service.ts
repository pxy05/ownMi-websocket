import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createSession(
  userId: string,
  sessionType: string,
  notes: string | null
) {
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("end_time", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data != null) {
    console.log(
      new Date(),
      "Session is active somewhere; deleting previous session for user:",
      userId
    );
    await supabase
      .from("focus_sessions")
      .delete()
      .eq("user_id", userId)
      .is("end_time", null);
  }

  console.log(new Date(), "Deleted and creating new session for user:", userId);

  const { data: newSession, error: createError } = await supabase
    .from("focus_sessions")
    .insert({
      user_id: userId,
      session_type: sessionType,
      notes: notes,
      created_at: new Date(),
      last_heartbeat: new Date(),
    })
    .select("*")
    .maybeSingle();

  if (error || !newSession) {
    console.error("Error creating session:", createError);
    return false;
  }

  return true;
}

export async function startSession(userId: string) {
  // Grab the most recent session for the user where start_time is null
  const { data: session, error: fetchError } = await supabase
    .from("focus_sessions")
    .select("id")
    .eq("user_id", userId)
    .is("start_time", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !session) {
    console.error("Error fetching most recent session:", fetchError);
    return;
  }

  const { error } = await supabase
    .from("focus_sessions")
    .update({
      last_heartbeat: new Date(),
      start_time: new Date(),
    })
    .eq("id", session.id);

  if (error) {
    console.error("Error starting session:", error);
    return;
  }
}

export async function endSession(userId: string) {
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("start_time")
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error ending session:", error);
    return;
  }

  if (!data?.start_time) {
    console.log(new Date(), "No start time found, deleting session");
    await supabase
      .from("focus_sessions")
      .delete()
      .eq("user_id", userId)
      .is("start_time", null);
    return;
  }

  await supabase
    .from("focus_sessions")
    .update({
      end_time: new Date(),
    })
    .eq("user_id", userId)
    .is("end_time", null);
}

export async function updateSessionHeartbeat(userId: string) {
  // Grab the most recent session for the user
  const { data: session, error: fetchError } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("end_time", null)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !session) {
    console.error("Error fetching most recent session:", fetchError);
    return;
  }

  const { error } = await supabase
    .from("focus_sessions")
    .update({
      last_heartbeat: new Date(),
    })
    .eq("id", session.id);

  if (error) {
    console.error("Error updating session heartbeat:", error);
    return;
  }
  console.log(new Date(), "Session heartbeat updated for user:", userId);
}

export async function verifySession(userId: string) {
  console.log(new Date(), "Verifying session for user:", userId);
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("end_time", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error verifying session:", error);
    return false;
  }

  return !!data;
}
