-- Ensure buckets are public
UPDATE storage.buckets SET public = true WHERE id IN ('videos', 'thumbnails');
