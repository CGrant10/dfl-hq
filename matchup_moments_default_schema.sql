-- Matchup moments are part of enabling notifications, with a per-device opt-out.
-- Apply once for the release. Future explicit category opt-outs remain saved.
-- Disabled devices remain disabled and their stored categories are untouched.
alter table public.push_subscriptions alter column categories set default
  '["announcements","trades","polls","fees","matchups","matchup_moments","weekly","sportsbook","waivers","events"]'::jsonb;

update public.push_subscriptions
   set categories = categories || '["matchup_moments"]'::jsonb,
       updated_at = now()
 where enabled = true
   and not (categories @> '["matchup_moments"]'::jsonb);
