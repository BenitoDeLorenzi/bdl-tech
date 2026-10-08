alter table public.perfis
 add column telefone text check(telefone is null or length(telefone)<=30),
 add column avatar_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-photos','profile-photos',false,3145728,array['image/webp']);
-- Private bucket: uploads, removal and signed reads are performed server-side for the authenticated user only.
