# Theme consistency

Dark and Light are the Medicine Wheel defaults. Do not add separate Medicine
Wheel picker entries. Legacy `medicine` and `medicine-light` preferences must
continue to resolve to Dark and Light, including synced member preferences.

When changing UI colors or themes, audit both Light and Dark on mobile. Use
shared theme tokens for buttons, text, borders and washes. Keep semantic status
colors and explicit NFL/member identity colors meaningful. Check text contrast,
startup appearance, selected/pressed states and shared navigation. Run `pnpm themes`
and the relevant theme tests; inspect actual screenshots before merging a visual
change. Record the reviewed screens and any unverified states in `theme-audit.md`.
