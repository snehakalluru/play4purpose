-- 017_seed_active_charities.sql
-- Seed active charities required by the registration dropdown.

INSERT INTO public.charities (id, name, description, active, created_at)
SELECT gen_random_uuid(), 'Green Earth Foundation', 'Environmental sustainability projects', true, now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.charities WHERE name = 'Green Earth Foundation'
);

INSERT INTO public.charities (id, name, description, active, created_at)
SELECT gen_random_uuid(), 'Children First Trust', 'Support for child education and welfare', true, now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.charities WHERE name = 'Children First Trust'
);

INSERT INTO public.charities (id, name, description, active, created_at)
SELECT gen_random_uuid(), 'Water for All', 'Clean water initiatives worldwide', true, now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.charities WHERE name = 'Water for All'
);

INSERT INTO public.charities (id, name, description, active, created_at)
SELECT gen_random_uuid(), 'Play4Purpose Relief Fund', 'Disaster relief and community support', true, now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.charities WHERE name = 'Play4Purpose Relief Fund'
);
