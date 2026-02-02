-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for slug lookups
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(is_published, published_at DESC);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can view published posts
CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts
FOR SELECT
USING (is_published = true);

-- Admins can view all posts
CREATE POLICY "Admins can view all blog posts"
ON public.blog_posts
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can create posts
CREATE POLICY "Admins can create blog posts"
ON public.blog_posts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') AND auth.uid() = author_id);

-- Admins can update posts
CREATE POLICY "Admins can update blog posts"
ON public.blog_posts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete posts
CREATE POLICY "Admins can delete blog posts"
ON public.blog_posts
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();