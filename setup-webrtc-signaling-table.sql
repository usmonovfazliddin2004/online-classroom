-- WebRTC Signaling Table for Supabase
-- This table stores WebRTC signaling messages (offer, answer, ICE candidates)

-- Create the table
CREATE TABLE IF NOT EXISTS public.webrtc_signaling (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  group_id BIGINT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('offer', 'answer', 'ice-candidate', 'live-start', 'kick')),
  data JSONB NOT NULL,
  read BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_webrtc_signaling_group_id ON public.webrtc_signaling(group_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signaling_receiver_id ON public.webrtc_signaling(receiver_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signaling_sender_id ON public.webrtc_signaling(sender_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signaling_type ON public.webrtc_signaling(type);

-- Enable Row Level Security
ALTER TABLE public.webrtc_signaling ENABLE ROW LEVEL SECURITY;

-- Create policies for webrtc_signaling table

-- Policy: Users can insert signaling messages
CREATE POLICY "Users can insert signaling messages" ON public.webrtc_signaling
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can view signaling messages sent to them
CREATE POLICY "Users can view their signaling messages" ON public.webrtc_signaling
  FOR SELECT
  TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- Policy: Users can delete their own signaling messages
CREATE POLICY "Users can delete their own signaling messages" ON public.webrtc_signaling
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Optional: Create a function to clean up old signaling messages
CREATE OR REPLACE FUNCTION cleanup_old_signaling_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM public.webrtc_signaling 
  WHERE created_at < NOW() - INTERVAL '1 hour'
  AND type = 'ice-candidate';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to auto-cleanup old messages
-- (Run cleanup_old_signaling_messages() periodically via pg_cron or application)

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON public.webrtc_signaling TO authenticated;
GRANT USAGE ON SEQUENCE webrtc_signaling_id_seq TO authenticated;