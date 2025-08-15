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
  //   user_id uuid not null,
  //   session_type character varying(20) not null,
  //   last_heartbeat timestamp without time zone not null,

  const { error } = await supabase.from("focus_sessions").insert({
    user_id: userId,
    session_type: sessionType,
    notes: notes,
  });

  if (error) {
    console.error("Error creating session:", error);
    return;
  }
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
    .single();

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
    .single();

  if (error) {
    console.error("Error ending session:", error);
    return;
  }

  if (!data?.start_time) {
    console.log("No start time found, deleting session");
    return;
  }
}

export async function updateSessionHeartbeat(userId: string) {
  // Grab the most recent session for the user
  const { data: session, error: fetchError } = await supabase
    .from("focus_sessions")
    .select("id")
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(1)
    .single();

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
}
