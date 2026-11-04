-- Change default so new videos are live instantly without admin approval
ALTER TABLE videos ALTER COLUMN status SET DEFAULT 'approved';

-- Promote any existing pending videos to approved
UPDATE videos SET status = 'approved' WHERE status = 'pending';
