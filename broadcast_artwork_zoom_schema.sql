-- =====================================================================
-- broadcast_items - artwork framing becomes a crop you can make.
-- ---------------------------------------------------------------------
-- RUN THIS BEFORE v1.194.0. Until it has run, saving a slide's framing
-- fails against the old CHECK constraints; everything else on the front
-- page keeps working, and slides already saved keep the framing they have.
--
-- WHAT CHANGES. image_position_x / image_position_y stop being three
-- keywords each and become a percentage, which is what object-position
-- has always meant - 'left' was 0%, 'center' 50%, 'right' 100%. Nine
-- possible framings become every framing, and the existing nine convert
-- exactly, so no slide moves.
--
-- image_zoom is new: how far in the picture is pushed past the crop the
-- stage would otherwise make. 1 is untouched.
--
-- A PERCENTAGE AND NOT A PIXEL OFFSET, deliberately. The stage is 52svh
-- of full-bleed width, so its shape depends on the phone holding it. A
-- stored pixel pan would expose the edge of a picture on a shape it was
-- not framed on; object-position is defined against whatever overflow
-- actually exists, so 40% is 40% of the way across the crop on every
-- device and an edge can never show.
-- =====================================================================

alter table public.broadcast_items
  drop constraint if exists broadcast_items_image_position_x,
  drop constraint if exists broadcast_items_image_position_y;

-- The nine keywords, in the only reading they ever had.
update public.broadcast_items set
  image_position_x = case image_position_x
    when 'left' then '0' when 'right' then '100' when 'center' then '50'
    else coalesce(nullif(image_position_x, ''), '50') end,
  image_position_y = case image_position_y
    when 'top' then '0' when 'bottom' then '100' when 'center' then '50'
    else coalesce(nullif(image_position_y, ''), '50') end;

alter table public.broadcast_items
  alter column image_position_x drop default,
  alter column image_position_y drop default,
  alter column image_position_x type numeric(5,2) using image_position_x::numeric,
  alter column image_position_y type numeric(5,2) using image_position_y::numeric,
  alter column image_position_x set default 50,
  alter column image_position_y set default 50,
  alter column image_position_x set not null,
  alter column image_position_y set not null;

alter table public.broadcast_items
  add column if not exists image_zoom numeric(4,2) not null default 1;

alter table public.broadcast_items
  drop constraint if exists broadcast_items_image_zoom;

alter table public.broadcast_items
  add constraint broadcast_items_image_position_x
    check (image_position_x >= 0 and image_position_x <= 100),
  add constraint broadcast_items_image_position_y
    check (image_position_y >= 0 and image_position_y <= 100),
  -- The floor is 1 because below it the picture stops covering the stage
  -- and the page shows through. The ceiling is where a phone-sized photo
  -- has run out of pixels and is being enlarged into mush.
  add constraint broadcast_items_image_zoom
    check (image_zoom >= 1 and image_zoom <= 4);

comment on column public.broadcast_items.image_position_x is
  'Focal point across the artwork, 0-100. The object-position percentage: 0 is the left edge, 100 the right.';
comment on column public.broadcast_items.image_position_y is
  'Focal point down the artwork, 0-100. 0 is the top edge, 100 the bottom.';
comment on column public.broadcast_items.image_zoom is
  'How far the artwork is pushed in past the stage crop. 1 is untouched; the focal point above stays put as it grows.';

-- No policy change: broadcast_items already has RLS and these presentation
-- columns follow the same row-level read/write permissions.

select image_fit, image_position_x, image_position_y, image_zoom, count(*)
from public.broadcast_items
group by image_fit, image_position_x, image_position_y, image_zoom;
