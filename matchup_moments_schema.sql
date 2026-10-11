-- Optional per-device category. Existing enrollments/defaults stay unchanged.
alter table public.notification_messages drop constraint if exists notification_messages_category_check;
alter table public.notification_messages add constraint notification_messages_category_check check (category in (
 'announcements','trades','polls','fees','matchups','matchup_moments','weekly',
 'sportsbook','waivers','events','updates','wall'
));
