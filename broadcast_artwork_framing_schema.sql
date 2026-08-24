-- Per-slide artwork framing controls. Existing slides retain cover/center.

alter table public.broadcast_items
  add column if not exists image_fit text not null default 'cover',
  add column if not exists image_position_x text not null default 'center',
  add column if not exists image_position_y text not null default 'center';

alter table public.broadcast_items
  drop constraint if exists broadcast_items_image_fit,
  drop constraint if exists broadcast_items_image_position_x,
  drop constraint if exists broadcast_items_image_position_y;

alter table public.broadcast_items
  add constraint broadcast_items_image_fit
    check (image_fit in ('cover','contain')),
  add constraint broadcast_items_image_position_x
    check (image_position_x in ('left','center','right')),
  add constraint broadcast_items_image_position_y
    check (image_position_y in ('top','center','bottom'));

comment on column public.broadcast_items.image_fit is
  'How custom artwork fills the broadcast stage: cover crops; contain shows the whole image.';
comment on column public.broadcast_items.image_position_x is
  'Horizontal focal point used when broadcast artwork is cropped.';
comment on column public.broadcast_items.image_position_y is
  'Vertical focal point used when broadcast artwork is cropped.';

-- No policy change: broadcast_items already has RLS and these presentation
-- columns follow the same row-level read/write permissions.

select image_fit, image_position_x, image_position_y, count(*)
from public.broadcast_items
group by image_fit, image_position_x, image_position_y;
