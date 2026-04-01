-- TEMPORARY: Disable RLS for testing (will re-enable later with proper policies)
ALTER TABLE group_lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('group_lessons', 'group_messages');
