CREATE POLICY "Anyone can upload store images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'store-images');

CREATE POLICY "Anyone can update store images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'store-images');