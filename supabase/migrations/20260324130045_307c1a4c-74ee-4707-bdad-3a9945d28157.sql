-- Add image_url column to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS image_url text;

-- Create store-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload store images
CREATE POLICY "Admins can upload store images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to update store images
CREATE POLICY "Admins can update store images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to delete store images
CREATE POLICY "Admins can delete store images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow public read access for store images
CREATE POLICY "Anyone can view store images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-images');