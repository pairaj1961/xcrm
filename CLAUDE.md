@AGENTS.md

# xCRM — Sales CRM & Shared Platform

## App identity
- Name: xCRM
- Port: 3000
- Stack: Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL

## This app OWNS the shared database schema
Run all migrations and db:push from this app only.
Never run prisma migrate or db:push from Equipment Rental APP
on shared tables.

## Shared tables (used by BOTH apps — modify with care)
- users           — all system users, 4 roles:
                    SYSTEM_ADMIN, SALES_REP, SALES_MANAGER, PRODUCTION_MANAGER
- brands          — product brands
- product_categories — categories linked to brands
- products        — catalog with sale + rental pricing
- customers       — customer companies
- customer_sites  — project sites per customer
- site_contacts   — contacts per site
- product_manager_brands — PM-to-brand assignments

## xCRM-only tables
leads, lead_products, activities, quotes, quote_line_items,
targets, product_notes, tags, lead_tags, audit_logs, settings

## Equipment Rental APP (port 3001)
- Uses same DATABASE_URL — shares all tables above
- Has its own tables: equipment, rental_contracts, rental_contract_items,
  delivery_schedules, maintenance_records, rental_invoices,
  rental_audit_logs, rental_settings
- JWT_SECRET must match for shared authentication

## Key commands
npm run dev          → port 3000
npm run db:push      → push schema (affects shared + xCRM tables)
npm run db:studio    → Prisma Studio (shows ALL tables incl. rental)
npm run db:seed      → seed xCRM data only

## SYSTEM_ADMIN role capabilities
- Manage users (create, edit, suspend)
- Manage brands, product categories, products
- Manage Settings (xCRM) and can access RentalSettings
- View all reports across both apps
