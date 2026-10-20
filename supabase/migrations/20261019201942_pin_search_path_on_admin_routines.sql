/*
  # Pin search_path on remaining routines

  Fixes a mutable search_path on three functions so their behaviour cannot be
  altered by objects created in another schema. No data is changed.
*/
ALTER FUNCTION public.create_sub_admin(text, text, text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.reset_admin_password(text, text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;