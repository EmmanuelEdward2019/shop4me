-- Security hardening (audit SEC-7): cap upload size and restrict MIME types on
-- the storage buckets. `agent-documents` in particular accepts anonymous
-- uploads (application flow) with no limits — an abuse/cost vector. These only
-- affect FUTURE uploads; existing objects are untouched. Legitimate uploads
-- (images / a PDF, well under the caps) are unaffected.

UPDATE storage.buckets
   SET file_size_limit = 10485760,  -- 10 MB
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
 WHERE id = 'agent-documents';

UPDATE storage.buckets
   SET file_size_limit = 10485760,  -- 10 MB
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic']
 WHERE id = 'chat-photos';

UPDATE storage.buckets
   SET file_size_limit = 5242880,   -- 5 MB
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic']
 WHERE id = 'avatars';

UPDATE storage.buckets
   SET file_size_limit = 10485760,  -- 10 MB
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
 WHERE id = 'blog-images';

UPDATE storage.buckets
   SET file_size_limit = 10485760,  -- 10 MB
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
 WHERE id = 'store-images';
