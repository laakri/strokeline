# Product analytics

Apply `migrations/20261006090000_product_analytics.sql` to the Supabase project before enabling analytics in a deployed app. It creates a private event table and two restricted RPCs:

- `track_product_event` accepts only a fixed list of event names and event-specific, bounded properties. The authenticated user ID is taken from the Supabase session, never from the browser payload.
- `delete_my_product_analytics` deletes events associated with the browser's anonymous analytics ID and the current authenticated user.

The app asks for opt-in consent and provides **Analytics and privacy settings** in the workspace header. Collection remains disabled until consent is granted. Events cover workspace visits, sign-in/out, template selection, run success/errors by diagnostic code, exports, preview playback, scene selection, layout guides, and presentation mode. The client does not send scripts, prompts, filenames, diagram labels, or export contents. IDs are random; no IP address, email, or user-agent is stored in the analytics table.

Use the Supabase SQL editor to explore aggregate usage. For example:

```sql
select event_name, count(*) as events, count(distinct anonymous_id) as visitors
from public.product_analytics_events
where created_at >= now() - interval '30 days'
group by event_name
order by events desc;

select properties ->> 'format' as export_format, count(*) as exports
from public.product_analytics_events
where event_name = 'export_completed'
  and created_at >= now() - interval '30 days'
group by export_format
order by exports desc;
```

Browser-side opt-in is a privacy control, not a security boundary against a modified client. Keep the database RPC validation and row-level security in place, and apply future retention requirements before collecting production data.
