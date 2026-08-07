-- Tighten notes / record_tags so rows cannot attach to another tenant's record.
-- Parent ownership: JWT sub must own the referenced records row (when record_id is set).

drop policy if exists record_tags_select on record_tags;
drop policy if exists record_tags_insert on record_tags;
drop policy if exists record_tags_update on record_tags;
drop policy if exists record_tags_delete on record_tags;

create policy record_tags_select on record_tags for select to authenticated using (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
  and exists (
    select 1 from records r
    where r.id = record_id
      and r.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
  )
);
create policy record_tags_insert on record_tags for insert to authenticated with check (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
  and exists (
    select 1 from records r
    where r.id = record_id
      and r.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
  )
);
create policy record_tags_update on record_tags for update to authenticated using (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
  and exists (
    select 1 from records r
    where r.id = record_id
      and r.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
  )
) with check (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
  and exists (
    select 1 from records r
    where r.id = record_id
      and r.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
  )
);
create policy record_tags_delete on record_tags for delete to authenticated using (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
  and exists (
    select 1 from records r
    where r.id = record_id
      and r.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
  )
);

drop policy if exists notes_select on notes;
drop policy if exists notes_insert on notes;
drop policy if exists notes_update on notes;
drop policy if exists notes_delete on notes;

create policy notes_select on notes for select to authenticated using (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
  and (
    record_id is null
    or exists (
      select 1 from records r
      where r.id = record_id
        and r.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
  )
);
create policy notes_insert on notes for insert to authenticated with check (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
  and (
    record_id is null
    or exists (
      select 1 from records r
      where r.id = record_id
        and r.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
  )
);
create policy notes_update on notes for update to authenticated using (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
  and (
    record_id is null
    or exists (
      select 1 from records r
      where r.id = record_id
        and r.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
  )
) with check (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
  and (
    record_id is null
    or exists (
      select 1 from records r
      where r.id = record_id
        and r.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
  )
);
create policy notes_delete on notes for delete to authenticated using (
  (current_setting('request.jwt.claims', true)::json->>'sub') = user_id
  and (
    record_id is null
    or exists (
      select 1 from records r
      where r.id = record_id
        and r.user_id = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
  )
);
