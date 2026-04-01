-- Enable RLS on group_lessons table
ALTER TABLE group_lessons ENABLE ROW LEVEL SECURITY;

-- Policy 1: Teachers can INSERT their own lessons
CREATE POLICY "Teachers can create lessons" ON group_lessons
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Policy 2: Group members can VIEW lessons from their groups
CREATE POLICY "Group members can view lessons" ON group_lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_lessons.group_id
      AND group_members.student_id = auth.uid()
    )
    OR auth.uid() = teacher_id
  );

-- Policy 3: Teachers can DELETE/UPDATE their own lessons
CREATE POLICY "Teachers can delete their lessons" ON group_lessons
  FOR DELETE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their lessons" ON group_lessons
  FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Enable RLS on group_messages table
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users in group can INSERT messages
CREATE POLICY "Group members can send messages" ON group_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_messages.group_id
      AND groups.teacher_id = auth.uid()
    )
  );

-- Policy 2: Users in group can VIEW messages
CREATE POLICY "Group members can view messages" ON group_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_messages.group_id
      AND groups.teacher_id = auth.uid()
    )
  );
