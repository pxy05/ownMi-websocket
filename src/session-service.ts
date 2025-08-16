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
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data != null) {
    if (data.end_time == null || data.start_time == null) {
      await supabase.from("focus_sessions").delete().eq("id", data?.id);
      console.log(
        new Date(),
        "Deleted and creating new session for user:",
        userId
      );
    }
  }

  const { data: newSession, error: createError } = await supabase
    .from("focus_sessions")
    .insert({
      user_id: userId,
      session_type: sessionType,
      notes: notes,
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
  // Fetch the most recent session with start_time null
  const { data: session, error: fetchError } = await supabase
    .from("focus_sessions")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !session) {
    console.error("Error fetching session to start:", fetchError);
    return;
  }

  // Update the start_time for that session
  const { data, error: updateError } = await supabase
    .from("focus_sessions")
    .update({ start_time: new Date() })
    .eq("id", session.id)
    .maybeSingle();

  if (fetchError || !data) {
    console.error("Error starting most recent session:", fetchError);
    return;
  }
}

export async function endSession(userId: string) {
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("id, start_time")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.start_time) {
    console.log(
      new Date(),
      "Ending and deleting unused session for user:",
      userId
    );
    await supabase
      .from("focus_sessions")
      .delete()
      .eq("id", data?.id)
      .is("start_time", null);
  } else if (data?.start_time) {
    console.log(
      new Date(),
      "Ending and saving active session for user:",
      userId
    );
    await supabase
      .from("focus_sessions")
      .update({
        end_time: new Date(),
      })
      .eq("id", data.id)
      .is("end_time", null);
  }

  if (error) {
    console.error("Error ending session:", error);
    return;
  }
}

export async function updateSessionHeartbeat(userId: string) {
  // Grab the most recent session for the user
  const { data: session, error: fetchError } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("end_time", null)
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
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error verifying session:", error);
    return false;
  }

  return !!data;
}
