-- ============================================================
-- BOSUN — Seed Data
-- Run AFTER schema.sql and storage-setup.sql
-- This creates demo users and populates reference data.
-- ============================================================

-- NOTE: Demo users must be created via Supabase Auth (Dashboard or API).
-- After creating dean@bosun.app and vendor@bosun.app users in Auth,
-- their profiles will be auto-created by the trigger.
-- Then run the UPDATE statements below to fill in profile details.

-- ============================================================
-- VENDOR PROFILES (run after vendor user is created in Auth)
-- We'll use placeholder UUIDs that you replace with actual Auth user IDs
-- ============================================================

-- For now, insert vendor profiles with the vendor user's auth ID.
-- Replace 'VENDOR_USER_ID' with the actual UUID from auth.users.

-- The seed script below should be run via the admin interface after
-- creating users. See supabase/seed-data.ts for programmatic seeding.

-- ============================================================
-- FEE TIERS (already seeded in schema.sql)
-- ============================================================

-- ============================================================
-- MAINTENANCE TASKS — Mercury Verado
-- ============================================================
insert into maintenance_tasks (engine_make, engine_model_pattern, task, category, interval_months, interval_hours, notes, sort_order) values
('Mercury', 'Verado', 'Change engine oil and filter', 'Engine Oil & Fuel', 12, 100, 'Use Mercury 25W-40 synthetic blend or equivalent', 1),
('Mercury', 'Verado', 'Replace fuel filter / water separator', 'Engine Oil & Fuel', 12, 200, 'Check for water in fuel bowl at each use', 2),
('Mercury', 'Verado', 'Inspect / replace spark plugs', 'Engine Oil & Fuel', 12, 300, 'NGK or Champion OEM spec', 3),
('Mercury', 'Verado', 'Inspect fuel lines and connections', 'Engine Oil & Fuel', 12, null, 'Look for cracks, chafing, soft spots', 4),
('Mercury', 'Verado', 'Replace supercharger oil', 'Engine Oil & Fuel', 12, 100, 'Verado-specific — uses dedicated reservoir', 5),
('Mercury', 'Verado', 'Flush cooling system (freshwater)', 'Cooling System', 1, null, 'After every saltwater use', 6),
('Mercury', 'Verado', 'Replace water pump impeller', 'Cooling System', 24, 300, 'Inspect housing and wear plate', 7),
('Mercury', 'Verado', 'Inspect thermostat and gaskets', 'Cooling System', 24, null, 'Replace if corroded or stuck', 8),
('Mercury', 'Verado', 'Replace gear lube (lower unit)', 'Drivetrain', 12, 100, 'Check for water intrusion — milky oil = seal failure', 9),
('Mercury', 'Verado', 'Inspect / grease prop shaft and seals', 'Drivetrain', 12, null, 'Check for fishing line wrap', 10),
('Mercury', 'Verado', 'Inspect shift cable and linkage', 'Drivetrain', 12, null, 'Adjust if needed', 11),
('Mercury', 'Verado', 'Replace sacrificial anodes (zincs)', 'Electrical & Safety', 6, null, 'Replace when 50% depleted', 12),
('Mercury', 'Verado', 'Inspect battery connections and charge', 'Electrical & Safety', 6, null, 'Clean terminals, check cranking amps', 13),
('Mercury', 'Verado', 'Test emergency lanyard / kill switch', 'Electrical & Safety', 3, null, 'Required safety check', 14),
('Mercury', 'Verado', 'Inspect hull for blisters / damage', 'Hull & Bottom', 12, null, 'Check at haul-out', 15),
('Mercury', 'Verado', 'Clean and repaint bottom (antifouling)', 'Hull & Bottom', 12, null, 'Every 12 months in tropical waters', 16);

-- Yamaha F-series
insert into maintenance_tasks (engine_make, engine_model_pattern, task, category, interval_months, interval_hours, notes, sort_order) values
('Yamaha', 'F-series', 'Change engine oil and filter', 'Engine Oil & Fuel', 12, 100, 'Use Yamalube 4M or equivalent 10W-30', 1),
('Yamaha', 'F-series', 'Replace fuel filter', 'Engine Oil & Fuel', 12, 200, null, 2),
('Yamaha', 'F-series', 'Inspect / replace spark plugs', 'Engine Oil & Fuel', 12, 300, null, 3),
('Yamaha', 'F-series', 'Flush cooling system', 'Cooling System', 1, null, 'After every saltwater use', 4),
('Yamaha', 'F-series', 'Replace water pump impeller', 'Cooling System', 24, 300, null, 5),
('Yamaha', 'F-series', 'Replace gear lube', 'Drivetrain', 12, 100, null, 6),
('Yamaha', 'F-series', 'Inspect prop and shaft', 'Drivetrain', 12, null, null, 7),
('Yamaha', 'F-series', 'Replace anodes', 'Electrical & Safety', 6, null, null, 8),
('Yamaha', 'F-series', 'Test safety lanyard', 'Electrical & Safety', 3, null, null, 9),
('Yamaha', 'F-series', 'Bottom paint and inspection', 'Hull & Bottom', 12, null, null, 10);

-- Suzuki DF
insert into maintenance_tasks (engine_make, engine_model_pattern, task, category, interval_months, interval_hours, notes, sort_order) values
('Suzuki', 'DF', 'Change engine oil and filter', 'Engine Oil & Fuel', 12, 100, 'Use Suzuki Ecstar or equivalent', 1),
('Suzuki', 'DF', 'Replace fuel filter', 'Engine Oil & Fuel', 12, 200, null, 2),
('Suzuki', 'DF', 'Replace spark plugs', 'Engine Oil & Fuel', 12, 300, null, 3),
('Suzuki', 'DF', 'Flush cooling system', 'Cooling System', 1, null, null, 4),
('Suzuki', 'DF', 'Replace water pump impeller', 'Cooling System', 24, 300, null, 5),
('Suzuki', 'DF', 'Replace gear oil', 'Drivetrain', 12, 100, null, 6),
('Suzuki', 'DF', 'Replace anodes', 'Electrical & Safety', 6, null, null, 7),
('Suzuki', 'DF', 'Bottom inspection', 'Hull & Bottom', 12, null, null, 8);

-- Honda BF
insert into maintenance_tasks (engine_make, engine_model_pattern, task, category, interval_months, interval_hours, notes, sort_order) values
('Honda', 'BF', 'Change engine oil and filter', 'Engine Oil & Fuel', 12, 100, 'Use Honda Marine 10W-30', 1),
('Honda', 'BF', 'Replace fuel filter', 'Engine Oil & Fuel', 12, 200, null, 2),
('Honda', 'BF', 'Replace spark plugs', 'Engine Oil & Fuel', 12, 300, null, 3),
('Honda', 'BF', 'Flush cooling system', 'Cooling System', 1, null, null, 4),
('Honda', 'BF', 'Replace water pump impeller', 'Cooling System', 24, 300, null, 5),
('Honda', 'BF', 'Replace gear oil', 'Drivetrain', 12, 100, null, 6),
('Honda', 'BF', 'Replace anodes', 'Electrical & Safety', 6, null, null, 7);
