-- =====================================================================
-- member_wall_posts - a posted picture is framed the way a slide is.
-- ---------------------------------------------------------------------
-- RUN THIS BEFORE v1.199.0. Until it has run, the Wall keeps working and
-- keeps accepting pictures - the composer reads the missing columns off
-- the error and posts without them - but a framing dragged onto a picture
-- is not saved.
--
-- WHY. The Wall's photo box is a fixed shape, so a phone photo was being
-- centre-cropped by the browser and half the time the crop cut the face
-- out. The broadcast solved this already: the picture is dragged and
-- pinched, and what is stored is where it sits. These are the same four
-- columns as broadcast_items, with the same meanings and the same CHECKs,
-- because they are read by the same module (js/broadcast-artwork.js).
--
-- NULLABLE, DELIBERATELY. A default of 'cover'/50/50/1 would be a framing
-- claim about every post ever made, and the Wall renders a post with no
-- framing exactly as it did before - natural shape, no crop. NULL means
-- "nobody framed this", and only rows posted by the new composer are
-- framed. Nothing already on the Wall moves.
--
-- A PERCENTAGE AND NOT A PIXEL OFFSET, for the reason spelled out in
-- broadcast_artwork_zoom_schema.sql: the box's width is the phone's, so a
-- stored pixel pan would expose an edge on a different screen.
-- object-position is defined against whatever overflow actually exists.
-- =====================================================================

alter table public.member_wall_posts
  add column if not exists image_fit text,
  add column if not exists image_position_x numeric(5,2),
  add column if not exists image_position_y numeric(5,2),
  add column if not exists image_zoom numeric(4,2);

alter table public.member_wall_posts
  drop constraint if exists member_wall_posts_image_fit,
  drop constraint if exists member_wall_posts_image_position_x,
  drop constraint if exists member_wall_posts_image_position_y,
  drop constraint if exists member_wall_posts_image_zoom;

-- NULL passes every one of these: an unframed post is a legal post.
alter table public.member_wall_posts
  add constraint member_wall_posts_image_fit
    check (image_fit in ('cover','contain')),
  add constraint member_wall_posts_image_position_x
    check (image_position_x >= 0 and image_position_x <= 100),
  add constraint member_wall_posts_image_position_y
    check (image_position_y >= 0 and image_position_y <= 100),
  -- The floor is 1 because below it the picture stops covering the box and
  -- the card shows through. The ceiling is where a phone-sized photo has
  -- run out of pixels. Both match ZOOM_MIN/ZOOM_MAX in broadcast-artwork.js.
  add constraint member_wall_posts_image_zoom
    check (image_zoom >= 1 and image_zoom <= 4);

comment on column public.member_wall_posts.image_fit is
  'How the picture fills the post''s photo box: cover crops; contain shows the whole thing. NULL means unframed - rendered at its natural shape.';
comment on column public.member_wall_posts.image_position_x is
  'Focal point across the picture, 0-100. The object-position percentage: 0 is the left edge, 100 the right.';
comment on column public.member_wall_posts.image_position_y is
  'Focal point down the picture, 0-100. 0 is the top edge, 100 the bottom.';
comment on column public.member_wall_posts.image_zoom is
  'How far the picture is pushed in past the box crop. 1 is untouched; the focal point above stays put as it grows.';

-- No policy change: member_wall_posts already has RLS and these presentation
-- columns follow the same row-level read/write permissions as body and image.

select
  count(*) as posts,
  count(image) as with_picture,
  count(image_fit) as framed
from public.member_wall_posts;
