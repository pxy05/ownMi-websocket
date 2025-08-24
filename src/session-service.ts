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
    .eq("end_time", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data != null) {
    if (data.start_time == null) {
      await supabase.from("focus_sessions").delete().eq("id", data?.id);
      console.log(
        new Date(),
        "Deleted and creating new session for user:",
        userId
      );
      return;
    }

    if (data.start_time < new Date().getTime() - 60 * 1000) {
      console.log(new Date(), "Session expired for user:", userId);
      await supabase.from("focus_sessions").delete().eq("id", data?.id);
      return;
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

  if (createError || !newSession) {
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
  const start_time = new Date();
  const { data, error: updateError } = await supabase
    .from("focus_sessions")
    .update({ start_time: start_time })
    .eq("id", session.id)
    .maybeSingle();

  console.log(new Date(), "Session started for user:", userId);

  if (updateError) {
    console.error("Error starting most recent session:", updateError.message);
    return;
  }
}

export async function endSession(userId: string) {
  const end = new Date();

  const { data, error } = await supabase
    .from("focus_sessions")
    .select("id, start_time, last_heartbeat")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching session to end:", error);
    return;
  }

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
    return;
  }

  const start = new Date(data.start_time as unknown as string);
  const duration_seconds = Math.floor((end.getTime() - start.getTime()) / 1000);

  if (duration_seconds < 0 || duration_seconds > 24 * 60 * 60 * 8) {
    // > 8 days
    console.warn("Suspicious duration_seconds:", {
      userId,
      start: data.start_time,
      end: end.toISOString(),
      duration_seconds,
    });
  }

  console.log(
    new Date(),
    "(",
    duration_seconds,
    ") Ending and saving active session for user:",
    userId
  );

  const { error: updError } = await supabase
    .from("focus_sessions")
    .update({
      end_time: end.toISOString(),
      duration_seconds: duration_seconds,
    })
    .eq("id", data.id)
    .is("end_time", null);

  if (updError) {
    console.error("Error ending session:", updError);
    return;
  }
}

export async function updateSessionHeartbeat(userId: string) {
  // Grab the most recent session for the user

  const heartbeat = new Date();

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
      last_heartbeat: heartbeat.toISOString(),
    })
    .eq("id", session.id);

  if (error) {
    console.error("Error updating session heartbeat:", error);
    return;
  }
  // console.log(new Date(), "Session heartbeat updated for user:", userId);
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
