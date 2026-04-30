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

-- Enable RLS on quizzes table
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Teachers can view their own quizzes
CREATE POLICY "Teachers can view own quizzes" ON quizzes
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Policy 2: Students can view quizzes assigned to them
CREATE POLICY "Students can view assigned quizzes" ON quizzes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quiz_assignments
      WHERE quiz_assignments.quiz_id = quizzes.id
      AND quiz_assignments.student_id = auth.uid()
    )
  );

-- Policy 3: Teachers can create quizzes
CREATE POLICY "Teachers can create quizzes" ON quizzes
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Policy 4: Teachers can update their own quizzes
CREATE POLICY "Teachers can update own quizzes" ON quizzes
  FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Policy 5: Teachers can delete their own quizzes
CREATE POLICY "Teachers can delete own quizzes" ON quizzes
  FOR DELETE
  USING (auth.uid() = teacher_id);

-- Enable RLS on quiz_assignments table
ALTER TABLE quiz_assignments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Students can view their own assignments
CREATE POLICY "Students can view own quiz assignments" ON quiz_assignments
  FOR SELECT
  USING (auth.uid() = student_id);

-- Policy 2: Teachers can view assignments for their quizzes
CREATE POLICY "Teachers can view quiz assignments" ON quiz_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_assignments.quiz_id
      AND quizzes.teacher_id = auth.uid()
    )
  );

-- Policy 3: Students can update their own assignments (for status)
CREATE POLICY "Students can update own quiz assignments" ON quiz_assignments
  FOR UPDATE
  USING (auth.uid() = student_id);

-- Policy 4: Teachers can update assignments
CREATE POLICY "Teachers can update quiz assignments" ON quiz_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_assignments.quiz_id
      AND quizzes.teacher_id = auth.uid()
    )
  );
