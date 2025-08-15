import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function verifyUserToken(token: string) {
  console.log("Verifying user token...");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    console.log("User not found or error occurred", error);
    return null;
  }
  console.log("User verified:", data.user.id);
  return data.user;
}
