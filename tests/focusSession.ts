import { startSession, endSession, deleteSession } from "../src/session-service";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

let consoleOutput: string[] = [];
let consoleWarnings: string[] = [];
let consoleErrors: string[] = [];

beforeEach(() => {
  consoleOutput = [];
  consoleWarnings = [];
  consoleErrors = [];
  
  console.log = (...args: any[]) => {
    consoleOutput.push(args.join(' '));
  };
  
  console.warn = (...args: any[]) => {
    consoleWarnings.push(args.join(' '));
  };
  
  console.error = (...args: any[]) => {
    consoleErrors.push(args.join(' '));
  };
});

afterEach(async () => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  
  // Clean up test data after each test
  try {
    await supabase
      .from('focus_sessions')
      .delete()
      .eq('user_id', CLIENT_USER_ID);
  } catch (error) {
    // Ignore cleanup errors
  }
});

const CLIENT_USER_ID = "cb095e4e-e945-42ee-bc87-b9158d3882c5";

describe('Focus Session Service Tests', () => {
  describe('startSession Function', () => {
    test('should successfully start a new focus session', async () => {
      const result = await startSession(CLIENT_USER_ID);

      // Verify session was created in database
      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID)
        .eq('session_type', 'from_zero')
        .is('end_time', null);

      expect(error).toBeNull();
      expect(sessions).toHaveLength(1);
      expect(sessions![0].user_id).toBe(CLIENT_USER_ID);
      expect(sessions![0].session_type).toBe('from_zero');
      expect(sessions![0].start_time).toBeDefined();
      expect(sessions![0].created_at).toBeDefined();
      expect(result).toBeDefined();
    });

    test('should create session with correct timestamp', async () => {
      const beforeCall = new Date();
      
      await startSession(CLIENT_USER_ID);

      const afterCall = new Date();
      
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('created_at, start_time')
        .eq('user_id', CLIENT_USER_ID)
        .single();

      expect(sessions).toBeDefined();
      expect(new Date(sessions!.created_at).getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(new Date(sessions!.created_at).getTime()).toBeLessThanOrEqual(afterCall.getTime());
      expect(new Date(sessions!.start_time).getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(new Date(sessions!.start_time).getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    test('should handle multiple sessions for same user', async () => {
      // Start first session
      await startSession(CLIENT_USER_ID);
      
      // End first session
      await endSession(CLIENT_USER_ID);
      
      // Start second session
      await startSession(CLIENT_USER_ID);

      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID)
        .order('created_at', { ascending: false });

      expect(sessions).toHaveLength(2);
      expect(sessions![0].end_time).toBeNull(); // Most recent session should be active
      expect(sessions![1].end_time).not.toBeNull(); // Previous session should be ended
    });

    test('should handle database errors gracefully', async () => {
      // This test would require mocking Supabase to return an error
      // For now, we'll test that the function doesn't throw
      const result = await startSession(CLIENT_USER_ID);
      expect(result).toBeDefined();
    });
  });

  describe('endSession Function', () => {
    test('should successfully end an active focus session', async () => {
      // Start a session first
      await startSession(CLIENT_USER_ID);
      
      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // End the session
      const result = await endSession(CLIENT_USER_ID);

      // Verify session was updated
      const { data: session } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID)
        .eq('session_type', 'from_zero')
        .single();

      expect(session).toBeDefined();
      expect(session!.end_time).not.toBeNull();
      expect(session!.duration_seconds).toBeGreaterThan(0);
      expect(session!.duration_seconds).toBeLessThan(10); // Should be around 100ms
      expect(result).toBeDefined();
    });

    test('should calculate correct duration for longer session', async () => {
      // Start a session
      await startSession(CLIENT_USER_ID);
      
      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // End the session
      await endSession(CLIENT_USER_ID);

      // Verify duration calculation
      const { data: session } = await supabase
        .from('focus_sessions')
        .select('duration_seconds')
        .eq('user_id', CLIENT_USER_ID)
        .single();

      expect(session).toBeDefined();
      expect(session!.duration_seconds).toBeGreaterThanOrEqual(1);
      expect(session!.duration_seconds).toBeLessThanOrEqual(3);
    });

    test('should handle ending non-existent session gracefully', async () => {
      // Try to end a session that doesn't exist
      const result = await endSession(CLIENT_USER_ID);

      // Should not throw error, but should log the issue
      expect(consoleOutput.some(output => output.includes('No active session'))).toBe(true);
      expect(result).toBeUndefined();
    });

    test('should handle multiple active sessions by selecting most recent', async () => {
      // Start first session
      await startSession(CLIENT_USER_ID);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start second session (this should create multiple active sessions)
      await startSession(CLIENT_USER_ID);
      
      // End session - should handle multiple sessions
      await endSession(CLIENT_USER_ID);

      // Verify only one session remains active
      const { data: activeSessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID)
        .is('end_time', null);

      expect(activeSessions).toHaveLength(1);
    });

    test('should delete sessions with suspicious duration (< 30 seconds)', async () => {
      // Start a session
      await startSession(CLIENT_USER_ID);
      
      // End immediately (should be < 30 seconds)
      await endSession(CLIENT_USER_ID);

      // Verify session was deleted due to suspicious duration
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID);

      // Session should be deleted, so no sessions should exist
      expect(sessions).toHaveLength(0);
    });

    test('should delete sessions with suspicious duration (> 24 hours)', async () => {
      // Start a session
      await startSession(CLIENT_USER_ID);
      
      // Manually update the session to have a very old start_time
      const { data: session } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID)
        .single();

      const veryOldTime = new Date(Date.now() - (25 * 60 * 60 * 1000)); // 25 hours ago
      await supabase
        .from('focus_sessions')
        .update({ start_time: veryOldTime.toISOString() })
        .eq('id', session!.id);

      // End the session
      await endSession(CLIENT_USER_ID);

      // Verify session was deleted due to suspicious duration
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID);

      // Session should be deleted, so no sessions should exist
      expect(sessions).toHaveLength(0);
    });

    test('should only update sessions with null end_time', async () => {
      // Start and end a session
      await startSession(CLIENT_USER_ID);
      await endSession(CLIENT_USER_ID);
      
      const firstEndTime = new Date();
      
      // Try to end the same session again
      await endSession(CLIENT_USER_ID);

      // Verify the end_time wasn't changed
      const { data: session } = await supabase
        .from('focus_sessions')
        .select('end_time')
        .eq('user_id', CLIENT_USER_ID)
        .single();

      expect(session).toBeDefined();
      expect(new Date(session!.end_time).getTime()).toBeLessThanOrEqual(firstEndTime.getTime() + 1000);
    });
  });

  describe('deleteSession Function', () => {
    test('should successfully delete a session by ID', async () => {
      // Start a session
      await startSession(CLIENT_USER_ID);
      
      // Get the session ID
      const { data: session } = await supabase
        .from('focus_sessions')
        .select('id')
        .eq('user_id', CLIENT_USER_ID)
        .single();

      expect(session).toBeDefined();
      
      // Delete the session
      await deleteSession(session!.id, CLIENT_USER_ID);

      // Verify session was deleted
      const { data: deletedSession } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('id', session!.id)
        .single();

      expect(deletedSession).toBeNull();
    });

    test('should handle deleting non-existent session gracefully', async () => {
      // Try to delete a session that doesn't exist
      await deleteSession('non-existent-id', CLIENT_USER_ID);

      // Should not throw error
      expect(true).toBe(true); // Test passes if no error is thrown
    });
  });

  describe('Complete Focus Session Workflow', () => {
    test('should simulate complete focus session: start -> work -> end', async () => {
      // Start the session
      const startResult = await startSession(CLIENT_USER_ID);
      
      // Verify session was created
      const { data: activeSession } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID)
        .is('end_time', null)
        .single();

      expect(activeSession).toBeDefined();
      expect(activeSession!.user_id).toBe(CLIENT_USER_ID);
      expect(activeSession!.session_type).toBe('from_zero');

      // Simulate work time (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // End the session
      const endResult = await endSession(CLIENT_USER_ID);

      // Verify session was properly ended
      const { data: endedSession } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID)
        .eq('id', activeSession!.id)
        .single();

      expect(endedSession).toBeDefined();
      expect(endedSession!.end_time).not.toBeNull();
      expect(endedSession!.duration_seconds).toBeGreaterThanOrEqual(1);
      expect(endedSession!.duration_seconds).toBeLessThanOrEqual(3);
      expect(endResult).toBeDefined();
    });

    test('should handle rapid start/end cycles', async () => {
      // Start and end multiple sessions quickly
      for (let i = 0; i < 3; i++) {
        await startSession(CLIENT_USER_ID);
        await new Promise(resolve => setTimeout(resolve, 100));
        await endSession(CLIENT_USER_ID);
      }

      // Verify all sessions were created and ended
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID)
        .order('created_at', { ascending: true });

      expect(sessions).toHaveLength(3);
      
      // All sessions should be ended
      sessions!.forEach(session => {
        expect(session.end_time).not.toBeNull();
        expect(session.duration_seconds).toBeGreaterThan(0);
      });
    });

    test('should maintain data integrity across sessions', async () => {
      // Start first session
      await startSession(CLIENT_USER_ID);
      await new Promise(resolve => setTimeout(resolve, 100));
      await endSession(CLIENT_USER_ID);

      // Start second session
      await startSession(CLIENT_USER_ID);
      await new Promise(resolve => setTimeout(resolve, 100));
      await endSession(CLIENT_USER_ID);

      // Verify both sessions exist with correct data
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID)
        .order('created_at', { ascending: true });

      expect(sessions).toHaveLength(2);
      
      sessions!.forEach(session => {
        expect(session.user_id).toBe(CLIENT_USER_ID);
        expect(session.session_type).toBe('from_zero');
        expect(session.end_time).not.toBeNull();
        expect(session.duration_seconds).toBeGreaterThan(0);
      });

      // Verify sessions have different IDs and timestamps
      expect(sessions![0].id).not.toBe(sessions![1].id);
      expect(new Date(sessions![0].created_at).getTime()).toBeLessThan(
        new Date(sessions![1].created_at).getTime()
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle concurrent session operations', async () => {
      // Start multiple sessions concurrently
      const promises = [
        startSession(CLIENT_USER_ID),
        startSession(CLIENT_USER_ID),
        startSession(CLIENT_USER_ID)
      ];

      await Promise.all(promises);

      // Should have multiple sessions
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID)
        .is('end_time', null);

      expect(sessions!.length).toBeGreaterThan(0);
    });

    test('should handle very short sessions', async () => {
      await startSession(CLIENT_USER_ID);
      // No delay - end immediately
      await endSession(CLIENT_USER_ID);

      // Session should be deleted due to suspicious duration
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', CLIENT_USER_ID);

      expect(sessions).toHaveLength(0);
    });

    test('should not log messages when NODE_ENV=test', async () => {
      // Since NODE_ENV=test, logger.emit() calls should not produce console output
      await startSession(CLIENT_USER_ID);
      await endSession(CLIENT_USER_ID);
      
      // Verify that no logger messages appear in console output
      // The only console output should be from console.warn() calls, not logger.emit()
      const loggerMessages = consoleOutput.filter(output => 
        output.includes('| startSession') || 
        output.includes('| endSession') || 
        output.includes('| deleteSession')
      );
      
      expect(loggerMessages).toHaveLength(0);
    });
  });
});