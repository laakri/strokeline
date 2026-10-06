# Product analytics

Apply both migrations in order to the Supabase project before deploying analytics. The second migration makes authentication mandatory for all new events, removes the anonymous tracking path, and clears legacy anonymous IDs. Legacy event names remain permitted by the table constraint only to preserve historical rows; the RPC no longer accepts those events.

- `track_product_event` accepts only a fixed list of event names and event-specific, bounded properties. The authenticated user ID is taken from the Supabase session, never from the browser payload.
- `delete_my_product_analytics` deletes events for the current authenticated user.

The `/workspace` route requires a valid Supabase session. Product events are collected automatically for signed-in users, and the account menu discloses this. Events cover workspace visits, sign-in, template selection, run success/errors by diagnostic code, exports, preview playback, scene selection, layout guides, and presentation mode. The client does not send scripts, prompts, filenames, diagram labels, or export contents. No anonymous visitor ID, IP address, email, or user-agent is stored in the analytics table.

Use the Supabase SQL editor to explore aggregate usage. For example:

```sql
select event_name, count(*) as events, count(distinct user_id) as users
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

The database RPC independently rejects unauthenticated requests, validates event names/properties, and derives `user_id` from the verified Supabase session. Keep row-level security in place and apply appropriate privacy disclosures, applicable legal requirements, and retention rules before collecting production data.
