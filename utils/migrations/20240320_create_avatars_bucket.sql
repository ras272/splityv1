-- Create avatars bucket if it doesn't exist
select case 
  when not exists (
    select 1 from storage.buckets where name = 'avatars'
  ) then
    storage.create_bucket(
      'avatars',
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      5242880, -- 5MB max file size
      true -- public bucket
    )
  else null
end;

-- Set public policy for avatars bucket
create policy "Avatars are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatars
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.uid() = (storage.foldername(name))[1]
  ); 