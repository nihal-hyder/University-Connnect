-- =============================================================================
-- 0012 STORAGE
-- media     (public)  event covers, society logos, avatars. Images only, 5 MB.
-- documents (private) society verification evidence. PDF/images, 10 MB.
--
-- Path conventions (first folder decides who may write):
--   media/users/<user_id>/...          owned by that user
--   media/societies/<society_id>/...   society managers / event creators
--   documents/applications/<user_id>/... applicant; readable by admins
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_write_media(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case (storage.foldername(p_name))[1]
    when 'users' then (storage.foldername(p_name))[2] = (select auth.uid())::text
    when 'societies' then
      private.has_society_permission(private.try_uuid((storage.foldername(p_name))[2]), 'manage_profile')
      or private.has_society_permission(private.try_uuid((storage.foldername(p_name))[2]), 'create_events')
      or private.has_society_permission(private.try_uuid((storage.foldername(p_name))[2]), 'edit_events')
    else false
  end;
$$;
grant execute on function private.can_write_media(text) to authenticated;

create policy "media public read" on storage.objects for select
  using (bucket_id = 'media');
create policy "media owners upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and private.can_write_media(name));
create policy "media owners update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and private.can_write_media(name))
  with check (bucket_id = 'media' and private.can_write_media(name));
create policy "media owners delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and private.can_write_media(name));

create policy "documents applicant upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'applications'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
create policy "documents applicant or admin read" on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (
      ((storage.foldername(name))[1] = 'applications' and (storage.foldername(name))[2] = (select auth.uid())::text)
      or private.is_platform_admin()
    )
  );
create policy "documents applicant delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'applications'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
