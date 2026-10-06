create table if not exists public.product_analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in (
    'app_opened',
    'auth_signed_in',
    'auth_signed_out',
    'template_selected',
    'script_run',
    'export_completed',
    'preview_playback',
    'scene_selected',
    'layout_guides_toggled',
    'presentation_toggled',
    'analytics_consent_changed'
  )),
  anonymous_id uuid not null,
  session_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_analytics_events_created_at_idx
  on public.product_analytics_events (created_at desc);
create index if not exists product_analytics_events_name_created_at_idx
  on public.product_analytics_events (event_name, created_at desc);
create index if not exists product_analytics_events_user_created_at_idx
  on public.product_analytics_events (user_id, created_at desc)
  where user_id is not null;

alter table public.product_analytics_events enable row level security;
revoke all on public.product_analytics_events from anon, authenticated;

create or replace function public.track_product_event(
  p_event_name text,
  p_anonymous_id uuid,
  p_session_id uuid,
  p_properties jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  property_keys text[];
begin
  if p_event_name not in (
    'app_opened',
    'auth_signed_in',
    'auth_signed_out',
    'template_selected',
    'script_run',
    'export_completed',
    'preview_playback',
    'scene_selected',
    'layout_guides_toggled',
    'presentation_toggled',
    'analytics_consent_changed'
  ) then
    raise exception 'Unsupported analytics event.';
  end if;

  if p_properties is null
    or pg_catalog.jsonb_typeof(p_properties) <> 'object'
    or pg_catalog.octet_length(p_properties::text) > 2048
  then
    raise exception 'Invalid analytics properties.';
  end if;

  select pg_catalog.array_agg(key order by key)
    into property_keys
    from pg_catalog.jsonb_object_keys(p_properties) as property(key);

  case p_event_name
    when 'app_opened' then
      if property_keys is distinct from array['device_class', 'viewport']::text[]
        or p_properties ->> 'device_class' not in ('touch', 'pointer')
        or p_properties ->> 'viewport' not in ('compact', 'regular', 'wide')
      then raise exception 'Invalid app_opened properties.'; end if;
    when 'auth_signed_in' then
      if property_keys is distinct from array['provider']::text[]
        or p_properties ->> 'provider' not in ('google', 'github', 'other')
      then raise exception 'Invalid auth_signed_in properties.'; end if;
    when 'auth_signed_out' then
      if property_keys is not null then raise exception 'auth_signed_out accepts no properties.'; end if;
    when 'template_selected' then
      if property_keys is distinct from array['template_id']::text[]
        or p_properties ->> 'template_id' not in (
          'use-case', 'class-diagram', 'sequence-diagram', 'scrum-board',
          'flowchart', 'entity-relationship'
        )
      then raise exception 'Invalid template_selected properties.'; end if;
    when 'script_run' then
      if property_keys is distinct from array['diagnostic_codes', 'result', 'scene_count']::text[]
        or p_properties ->> 'result' not in ('success', 'failure')
        or pg_catalog.jsonb_typeof(p_properties -> 'scene_count') <> 'number'
        or (p_properties ->> 'scene_count')::numeric < 0
        or (p_properties ->> 'scene_count')::numeric > 1000
        or pg_catalog.jsonb_typeof(p_properties -> 'diagnostic_codes') <> 'array'
        or pg_catalog.jsonb_array_length(p_properties -> 'diagnostic_codes') > 20
        or exists (
          select 1
          from pg_catalog.jsonb_array_elements(p_properties -> 'diagnostic_codes') as code(value)
          where pg_catalog.jsonb_typeof(code.value) <> 'string'
            or code.value #>> '{}' !~ '^[A-Z][A-Z0-9_]{0,47}$'
        )
      then raise exception 'Invalid script_run properties.'; end if;
    when 'export_completed' then
      if not (p_properties ? 'format')
        or exists (
          select 1 from pg_catalog.jsonb_object_keys(p_properties) as property(key)
          where property.key not in ('format', 'resolution', 'fps')
        )
        or p_properties ->> 'format' not in ('mp4', 'webm', 'gif', 'png', 'srt', 'vtt')
        or (p_properties ? 'resolution' and p_properties ->> 'resolution' not in ('720p', '1080p'))
        or (p_properties ? 'fps' and p_properties ->> 'fps' not in ('30', '60'))
      then raise exception 'Invalid export_completed properties.'; end if;
    when 'preview_playback' then
      if property_keys is distinct from array['action', 'mode']::text[]
        or p_properties ->> 'action' not in ('play', 'pause')
        or p_properties ->> 'mode' not in ('scene', 'all')
      then raise exception 'Invalid preview_playback properties.'; end if;
    when 'scene_selected' then
      if property_keys is distinct from array['scene_index']::text[]
        or pg_catalog.jsonb_typeof(p_properties -> 'scene_index') <> 'number'
        or (p_properties ->> 'scene_index')::numeric < 1
        or (p_properties ->> 'scene_index')::numeric > 1000
        or (p_properties ->> 'scene_index')::numeric <> pg_catalog.trunc((p_properties ->> 'scene_index')::numeric)
      then raise exception 'Invalid scene_selected properties.'; end if;
    when 'layout_guides_toggled', 'presentation_toggled', 'analytics_consent_changed' then
      if property_keys is distinct from array['enabled']::text[]
        or pg_catalog.jsonb_typeof(p_properties -> 'enabled') <> 'boolean'
      then raise exception 'Invalid toggle event properties.'; end if;
  end case;

  insert into public.product_analytics_events (
    event_name, anonymous_id, session_id, user_id, properties
  ) values (
    p_event_name, p_anonymous_id, p_session_id, auth.uid(), p_properties
  );
end;
$$;

create or replace function public.delete_my_product_analytics(p_anonymous_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.product_analytics_events
  where anonymous_id = p_anonymous_id
    and (user_id is null or user_id = auth.uid());
$$;

revoke all on function public.track_product_event(text, uuid, uuid, jsonb) from public;
revoke all on function public.delete_my_product_analytics(uuid) from public;
grant execute on function public.track_product_event(text, uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.delete_my_product_analytics(uuid) to anon, authenticated;
