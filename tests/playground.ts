import { start } from "repl";
import { startSession, endSession, deleteNullSessions } from "../src/session-service"
import { createClient } from "@supabase/supabase-js";

const CLIENT_USER_ID = "dc045fc5-04a5-4d0c-9492-c89375f68294";


// (async () => {
//   const createdSession = await startSession(CLIENT_USER_ID);
//   await endSession(CLIENT_USER_ID);
// })();


(async () => {
    deleteNullSessions(CLIENT_USER_ID);
  })();