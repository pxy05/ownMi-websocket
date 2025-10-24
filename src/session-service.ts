import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

import tools from "./util/tools";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function deleteSession(sessionID: string, userID: string, logMessages: boolean = true) {
  try { 
    const { error } = await supabase
      .from("focus_sessions")
      .delete()
      .eq("id", sessionID)

    if (error) {
      const logger = new tools.logger(userID, true, true, process.env.NODE_ENV !== 'test');
      logger.emit("ERROR: " + error.message  + " | deleteSession");
    }
  } catch (error) {
    const logger = new tools.logger(userID, true, true, process.env.NODE_ENV !== 'test');
    logger.emit("ERROR in deleteSession: " + error + " | deleteSession");
  }
}




export async function deleteNullSessions(userId: string, logMessages: boolean = true) {
  const logger = new tools.logger(userId, true, true, process.env.NODE_ENV !== 'test');
  
  try {
    const { error: error1 } = await supabase
      .from("focus_sessions")
      .delete()
      .is("end_time", null);

    if (error1) {
      const logger = new tools.logger(userId, true, true, process.env.NODE_ENV !== 'test');
      logger.emit("ERROR deleting null sessions: " + error1.message  + " | deleteNullSessions");
    }

    const { error: error2 } = await supabase
      .from("focus_sessions")
      .delete()
      .is("start_time", null)
      .not("end_time", "is", null);

    if (error2) {
      logger.emit("ERROR deleting start_time null sessions: " + error2.message + " | deleteNullSessions");
      return;
    }

    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const { error: error3 } = await supabase
      .from("focus_sessions")
      .delete()
      .not("start_time", "is", null)
      .not("end_time", "is", null)
      .gte("start_time", thirtySecondsAgo);

    if (error3) {
      logger.emit("ERROR deleting short sessions: " + error3.message + " | deleteNullSessions");
      return;
    }


    logger.emit("Deleted null sessions | deleteNullSessions");

  } catch (error) {
    logger.emit("ERROR in deleteNullSessions: " + error + " | deleteNullSessions");
  }
}

export async function startSession(userId: string, logMessages: boolean = true) {
  const time = new Date()

  let session = {
    user_id: userId,
    session_type: "from_zero",
    created_at: time.toISOString(),
    start_time: time.toISOString(),
  }

  try {
    const {data: newSession, error: createError} = await supabase
    .from("focus_sessions").insert(session).select("*").maybeSingle();

    if (createError || !newSession) {
      const logger = new tools.logger(userId, true, true, process.env.NODE_ENV !== 'test');
      logger.emit("ERROR: " + createError!.message + " | startSession");
    }
    return newSession;

  } catch (error) {
    const logger = new tools.logger(userId, true, true, process.env.NODE_ENV !== 'test');
    logger.emit("ERROR in startSession: " + error + " | startSession");
  }


}

export async function endSession(userId: string, logMessages: boolean = true) {
  const logger = new tools.logger(userId, true, true)

  type Session = {
    id: string;
    user_id: string;
    session_type: string;
    created_at: string;
    start_time: string;
    end_time: string;
    duration_seconds: number;
  }

  let suspiciousFlag = false;


  try {
    let { data: activeSession, error: createError }: { data: Array<Session> | Session | null, error: Error | null } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("end_time", null);

    if (activeSession && Array.isArray(activeSession) && activeSession.length > 1) {
      suspiciousFlag = true;
      logger.emit("Multiple null sessions | Deleting Null sessions at end of function call | endSession");

      let mostRecentSession: Session = activeSession[0];

      for (const session of activeSession) {
        if (new Date(session.start_time) > new Date(mostRecentSession.start_time)) {
          mostRecentSession = session;
        }
      }

      activeSession = mostRecentSession;
    } else if (activeSession && Array.isArray(activeSession) && activeSession.length === 1) {
      // Single session in array
      activeSession = activeSession[0];
    }
    // If activeSession is null or not an array, keep it as is

  activeSession = activeSession as Session;
  if (!activeSession) {
    logger.emit("No active session | endSession");
    return;
  }



  if (createError) {
    logger.emit(createError.message + " | endSession");
    return;
  }

  if (!activeSession) {
    logger.emit("No active session | endSession");
    return;
  }

  // Calculate end time just before duration calculation
  const end = new Date();
  const start = new Date(activeSession.start_time);
  const duration_seconds = Math.floor((end.getTime() - start.getTime()) / 1000);

  if (duration_seconds > 24 * 60 * 60 || duration_seconds < 1) {
    suspiciousFlag = true;
    logger.emit("Suspicious duration_seconds: " + duration_seconds + " | Deleting session | endSession");
    console.warn({
      userId,
      start: activeSession.start_time,
      end: end.toISOString(),
      duration_seconds,
    });
    await deleteSession(activeSession.id, userId);
    return; // Exit early since session was deleted
  }

  logger.emit("Saving session ("+ duration_seconds +")" + " | endSession");

  const { data: updatedSession, error: updError } = await supabase
    .from("focus_sessions")
    .update({
      end_time: end.toISOString(),
      duration_seconds: duration_seconds,
    })
    .eq("id", activeSession.id)
    .is("end_time", null)
    .select()
    .single();

  if (!updatedSession && !updError) {
    logger.emit("No error or updated session" + " | endSession");
    return;
  } else {

    if (updError) {
      logger.emit("Error ending session:" + updError!.message + " | endSession");
      return;
    }
  
    if (!updatedSession) {
      logger.emit("No updated session" + " | endSession");
      return;
    }
  }

  if (suspiciousFlag) {
    deleteNullSessions(userId);
    logger.emit("Clearing Null sessions as suspicious flag is true | endSession");
  }

  return updatedSession;
  } catch (error) {
    const logger = new tools.logger(userId, true, true, process.env.NODE_ENV !== 'test');
    logger.emit("ERROR in endSession: " + error + " | endSession");
  }
}