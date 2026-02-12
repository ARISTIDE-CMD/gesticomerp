-- Avatar setup for Molige ERP (run in Supabase SQL Editor)

-- 1) Add avatar column on both profile tables used in the app
alter table if exists public.profiles
  add column if not exists avatar_url text;

alter table if exists public.profils
  add column if not exists avatar_url text;

-- 2) Ensure users can update their own avatar_url
alter table if exists public.profiles enable row level security;
alter table if exists public.profils enable row level security;

do $$
begin
  begin
    create policy "profiles_select_own"
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid());
  exception when duplicate_object then null;
  end;

  begin
    create policy "profiles_update_own"
      on public.profiles
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  exception when duplicate_object then null;
  end;

  begin
    create policy "profils_select_own"
      on public.profils
      for select
      to authenticated
      using (id = auth.uid());
  exception when duplicate_object then null;
  end;

  begin
    create policy "profils_update_own"
      on public.profils
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  exception when duplicate_object then null;
  end;
end
$$;

-- 3) Create avatars bucket (public read URL)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 4) Storage policies: each authenticated user can manage files in its own folder: <auth.uid()>/...
do $$
begin
  begin
    create policy "avatars_read_authenticated"
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'avatars');
  exception when duplicate_object then null;
  end;

  begin
    create policy "avatars_insert_own"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  exception when duplicate_object then null;
  end;

  begin
    create policy "avatars_update_own"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  exception when duplicate_object then null;
  end;

  begin
    create policy "avatars_delete_own"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  exception when duplicate_object then null;
  end;
end
$$;
