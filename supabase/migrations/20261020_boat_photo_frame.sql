-- How the owner framed the boat's photo in the dashboard banner:
-- {"fit": "cover" | "contain", "zoom": 1, "x": 50, "y": 50}. Stored on the boat so it
-- follows the account on every device, instead of living in one browser.
alter table public.boats add column if not exists photo_frame jsonb;
