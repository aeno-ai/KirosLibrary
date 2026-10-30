BEGIN;

-- 1. Define exactly who belongs to this library.
CREATE OR REPLACE FUNCTION public.kiros_is_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT auth.uid()) IN (
      'authorized user'::uuid,
      'authorized user'::uuid
    ),
    false
  );
$$;

-- 2. Make sure RLS is enabled.
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- 3. Protect folders.
DROP POLICY IF EXISTS "kiros_member_gate"
ON public.categories;

CREATE POLICY "kiros_member_gate"
ON public.categories
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING ((SELECT public.kiros_is_member()))
WITH CHECK ((SELECT public.kiros_is_member()));

-- 4. Protect file records.
DROP POLICY IF EXISTS "kiros_member_gate"
ON public.files;

CREATE POLICY "kiros_member_gate"
ON public.files
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING ((SELECT public.kiros_is_member()))
WITH CHECK ((SELECT public.kiros_is_member()));

-- 5. Protect notes.
DROP POLICY IF EXISTS "kiros_member_gate"
ON public.notes;

CREATE POLICY "kiros_member_gate"
ON public.notes
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING ((SELECT public.kiros_is_member()))
WITH CHECK ((SELECT public.kiros_is_member()));

-- 6. Protect saved links.
DROP POLICY IF EXISTS "kiros_member_gate"
ON public.links;

CREATE POLICY "kiros_member_gate"
ON public.links
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING ((SELECT public.kiros_is_member()))
WITH CHECK ((SELECT public.kiros_is_member()));

-- 7. Protect the files in Supabase Storage.
DROP POLICY IF EXISTS "kiros_member_gate"
ON storage.objects;

CREATE POLICY "kiros_member_gate"
ON storage.objects
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (
  bucket_id = 'library'
  AND (SELECT public.kiros_is_member())
)
WITH CHECK (
  bucket_id = 'library'
  AND (SELECT public.kiros_is_member())
);

COMMIT;