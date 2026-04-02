import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding xCRM database...')

  // ─── Users ───────────────────────────────────────────────────────────────────
  const saltRounds = 10
  const adminHash   = await bcrypt.hash('Admin123!',   saltRounds)
  const managerHash = await bcrypt.hash('Manager123!', saltRounds)
  const pmHash      = await bcrypt.hash('PM123!',      saltRounds)
  const repHash     = await bcrypt.hash('Rep123!',     saltRounds)

  const admin      = await prisma.user.upsert({ where: { email: 'admin@demo.com' },           update: {}, create: { email: 'admin@demo.com',           passwordHash: adminHash,   firstName: 'Admin',   lastName: 'User',         role: 'ADMIN' } })
  const manager    = await prisma.user.upsert({ where: { email: 'manager@demo.com' },         update: {}, create: { email: 'manager@demo.com',         passwordHash: managerHash, firstName: 'Somsak',  lastName: 'Manager',      role: 'MANAGER' } })
  const pmHeavy    = await prisma.user.upsert({ where: { email: 'pm.heavy@demo.com' },        update: {}, create: { email: 'pm.heavy@demo.com',        passwordHash: pmHash,      firstName: 'Prasert', lastName: 'Heavy',        role: 'PRODUCT_MANAGER' } })
  const pmPower    = await prisma.user.upsert({ where: { email: 'pm.power@demo.com' },        update: {}, create: { email: 'pm.power@demo.com',        passwordHash: pmHash,      firstName: 'Nattaya', lastName: 'Power',        role: 'PRODUCT_MANAGER' } })
  const pmConsumables = await prisma.user.upsert({ where: { email: 'pm.consumables@demo.com' }, update: {}, create: { email: 'pm.consumables@demo.com', passwordHash: pmHash,   firstName: 'Kanya',   lastName: 'Consumables',  role: 'PRODUCT_MANAGER' } })
  const rep1       = await prisma.user.upsert({ where: { email: 'rep1@demo.com' },            update: {}, create: { email: 'rep1@demo.com',            passwordHash: repHash,     firstName: 'Somchai', lastName: 'K.',           role: 'REP' } })
  const rep2       = await prisma.user.upsert({ where: { email: 'rep2@demo.com' },            update: {}, create: { email: 'rep2@demo.com',            passwordHash: repHash,     firstName: 'Pranee',  lastName: 'L.',           role: 'REP' } })
  const rep3       = await prisma.user.upsert({ where: { email: 'rep3@demo.com' },            update: {}, create: { email: 'rep3@demo.com',            passwordHash: repHash,     firstName: 'Wichai',  lastName: 'T.',           role: 'REP' } })

  console.log('✓ Users created')

  // ─── Settings ─────────────────────────────────────────────────────────────
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', companyName: 'Thai Heavy Equipment Co., Ltd.', taxRate: 7, currency: 'THB' },
    update: {},
  })
  console.log('✓ Settings created')

  // ─── Brands ───────────────────────────────────────────────────────────────
  const brandDefs = [
    { name: 'DeWalt',            countryOfOrigin: 'US' },
    { name: 'Mikasa',            countryOfOrigin: 'JP' },
    { name: 'Atlas Copco',       countryOfOrigin: 'SE' },
    { name: 'Chicago Pneumatic', countryOfOrigin: 'US' },
    { name: 'Maruzen',           countryOfOrigin: 'JP' },
    { name: 'Shirota',           countryOfOrigin: 'JP' },
    { name: 'Enerpac',           countryOfOrigin: 'US' },
    { name: 'Lissmac',           countryOfOrigin: 'DE' },
    { name: '3M',                countryOfOrigin: 'US' },
    { name: 'Gemini',            countryOfOrigin: 'TH' },
    { name: 'Rexco',             countryOfOrigin: 'TH' },
  ]
  const brands: Record<string, { id: string }> = {}
  for (const b of brandDefs) {
    brands[b.name] = await prisma.brand.upsert({
      where: { name: b.name }, update: {},
      create: { name: b.name, countryOfOrigin: b.countryOfOrigin, isActive: true },
    })
  }
  console.log('✓ Brands created')

  // ─── PM Brand Assignments ─────────────────────────────────────────────────
  const pmAssignments = [
    { pm: pmHeavy,       brandNames: ['Mikasa', 'Atlas Copco', 'Shirota', 'Lissmac'] },
    { pm: pmPower,       brandNames: ['DeWalt', 'Chicago Pneumatic', 'Enerpac'] },
    { pm: pmConsumables, brandNames: ['Maruzen', '3M', 'Gemini', 'Rexco'] },
  ]
  for (const { pm, brandNames } of pmAssignments) {
    for (const brandName of brandNames) {
      await prisma.productManagerBrand.upsert({
        where: { userId_brandId: { userId: pm.id, brandId: brands[brandName].id } },
        update: {}, create: { userId: pm.id, brandId: brands[brandName].id },
      })
    }
  }
  console.log('✓ Brand assignments created')

  // ─── Product Categories ───────────────────────────────────────────────────
  const catDefs: { brand: string; name: string; productType: string }[] = [
    { brand: 'DeWalt',            name: 'Power Drills',       productType: 'EQUIPMENT'  },
    { brand: 'DeWalt',            name: 'Circular Saws',      productType: 'EQUIPMENT'  },
    { brand: 'DeWalt',            name: 'Batteries & Chargers', productType: 'ACCESSORY' },
    { brand: 'Mikasa',            name: 'Plate Compactors',   productType: 'EQUIPMENT'  },
    { brand: 'Mikasa',            name: 'Concrete Vibrators', productType: 'EQUIPMENT'  },
    { brand: 'Mikasa',            name: 'Power Trowels',      productType: 'EQUIPMENT'  },
    { brand: 'Atlas Copco',       name: 'Air Compressors',    productType: 'EQUIPMENT'  },
    { brand: 'Atlas Copco',       name: 'Generators',         productType: 'EQUIPMENT'  },
    { brand: 'Atlas Copco',       name: 'Hoses & Couplings',  productType: 'ACCESSORY'  },
    { brand: 'Chicago Pneumatic', name: 'Pneumatic Grinders', productType: 'EQUIPMENT'  },
    { brand: 'Chicago Pneumatic', name: 'Impact Wrenches',    productType: 'EQUIPMENT'  },
    { brand: 'Enerpac',           name: 'Hydraulic Jacks',    productType: 'EQUIPMENT'  },
    { brand: 'Enerpac',           name: 'Hydraulic Pumps',    productType: 'EQUIPMENT'  },
    { brand: 'Enerpac',           name: 'Torque Tools',       productType: 'EQUIPMENT'  },
    { brand: 'Lissmac',           name: 'Concrete Grinders',  productType: 'EQUIPMENT'  },
    { brand: 'Lissmac',           name: 'Shot Blasters',      productType: 'EQUIPMENT'  },
    { brand: '3M',                name: 'Abrasives',          productType: 'CONSUMABLE' },
    { brand: '3M',                name: 'Respirators & PPE',  productType: 'ACCESSORY'  },
    { brand: 'Maruzen',           name: 'Welding Equipment',  productType: 'EQUIPMENT'  },
    { brand: 'Maruzen',           name: 'Welding Wire',       productType: 'CONSUMABLE' },
    { brand: 'Gemini',            name: 'Diamond Blades',     productType: 'CONSUMABLE' },
    { brand: 'Gemini',            name: 'Core Bits',          productType: 'CONSUMABLE' },
    { brand: 'Rexco',             name: 'Release Agents',     productType: 'CONSUMABLE' },
    { brand: 'Rexco',             name: 'Curing Compounds',   productType: 'CONSUMABLE' },
    { brand: 'Shirota',           name: 'Diamond Core Drills', productType: 'EQUIPMENT' },
    { brand: 'Shirota',           name: 'Wall Saws',          productType: 'EQUIPMENT'  },
  ]
  const cats: Record<string, { id: string }> = {}
  for (const c of catDefs) {
    const key = `${c.brand}::${c.name}`
    cats[key] = await prisma.productCategory.create({
      data: { brandId: brands[c.brand].id, name: c.name, productType: c.productType, isActive: true },
    })
  }
  console.log('✓ Categories created')

  // ─── Products ─────────────────────────────────────────────────────────────
  const productDefs: { cat: string; brand: string; sku: string; modelName: string; productType: string; salePrice?: number; rentalDailyRate?: number; rentalWeeklyRate?: number; rentalMonthlyRate?: number; serviceRatePerHour?: number }[] = [
    { cat: 'DeWalt::Power Drills',       brand: 'DeWalt', sku: 'DWL-DCD796',  modelName: '18V Brushless Drill',          productType: 'EQUIPMENT', salePrice: 4500 },
    { cat: 'DeWalt::Power Drills',       brand: 'DeWalt', sku: 'DWL-DCD999',  modelName: 'FlexVolt Advantage Drill',     productType: 'EQUIPMENT', salePrice: 8900 },
    { cat: 'DeWalt::Circular Saws',      brand: 'DeWalt', sku: 'DWL-DCS570',  modelName: '18V Brushless Circular Saw',   productType: 'EQUIPMENT', salePrice: 6200 },
    { cat: 'DeWalt::Circular Saws',      brand: 'DeWalt', sku: 'DWL-DCS578',  modelName: 'FlexVolt 54V Circular Saw',    productType: 'EQUIPMENT', salePrice: 11500 },
    { cat: 'DeWalt::Batteries & Chargers', brand: 'DeWalt', sku: 'DWL-DCB184', modelName: '18V 5Ah XR Li-Ion Battery',  productType: 'ACCESSORY', salePrice: 1800 },
    { cat: 'Mikasa::Plate Compactors',   brand: 'Mikasa', sku: 'MKS-MVCF60H', modelName: 'Plate Compactor 60cm',        productType: 'EQUIPMENT', salePrice: 65000, rentalDailyRate: 1500, rentalWeeklyRate: 7500, rentalMonthlyRate: 22000 },
    { cat: 'Mikasa::Plate Compactors',   brand: 'Mikasa', sku: 'MKS-MVCF80H', modelName: 'Plate Compactor 80cm',        productType: 'EQUIPMENT', salePrice: 95000, rentalDailyRate: 2200, rentalWeeklyRate: 11000, rentalMonthlyRate: 32000 },
    { cat: 'Mikasa::Concrete Vibrators', brand: 'Mikasa', sku: 'MKS-MVE38',   modelName: 'Electric Vibrator 38mm',      productType: 'EQUIPMENT', salePrice: 18500, rentalDailyRate: 600, rentalWeeklyRate: 3000, rentalMonthlyRate: 8500 },
    { cat: 'Mikasa::Power Trowels',      brand: 'Mikasa', sku: 'MKS-MTC80GH', modelName: 'Power Trowel 80cm',           productType: 'EQUIPMENT', salePrice: 75000, rentalDailyRate: 2000, rentalWeeklyRate: 10000, rentalMonthlyRate: 28000 },
    { cat: 'Atlas Copco::Air Compressors', brand: 'Atlas Copco', sku: 'ATC-GA22', modelName: '22kW Rotary Screw Compressor', productType: 'EQUIPMENT', salePrice: 285000, rentalDailyRate: 3500, rentalWeeklyRate: 17500, rentalMonthlyRate: 52000, serviceRatePerHour: 1200 },
    { cat: 'Atlas Copco::Air Compressors', brand: 'Atlas Copco', sku: 'ATC-GA37', modelName: '37kW Rotary Screw Compressor', productType: 'EQUIPMENT', salePrice: 420000, rentalDailyRate: 5000, rentalWeeklyRate: 25000, rentalMonthlyRate: 75000, serviceRatePerHour: 1500 },
    { cat: 'Atlas Copco::Generators',    brand: 'Atlas Copco', sku: 'ATC-QAS30', modelName: 'Generator 30kVA',            productType: 'EQUIPMENT', salePrice: 320000, rentalDailyRate: 4000, rentalWeeklyRate: 20000, rentalMonthlyRate: 58000 },
    { cat: 'Atlas Copco::Generators',    brand: 'Atlas Copco', sku: 'ATC-QAS60', modelName: 'Generator 60kVA',            productType: 'EQUIPMENT', salePrice: 480000, rentalDailyRate: 6000, rentalWeeklyRate: 30000, rentalMonthlyRate: 85000 },
    { cat: 'Atlas Copco::Hoses & Couplings', brand: 'Atlas Copco', sku: 'ATC-HC20M', modelName: 'Air Hose 20m 3/4"',      productType: 'ACCESSORY', salePrice: 2800 },
    { cat: 'Chicago Pneumatic::Pneumatic Grinders', brand: 'Chicago Pneumatic', sku: 'CP-CP3550', modelName: '5" Angle Grinder', productType: 'EQUIPMENT', salePrice: 8500, rentalDailyRate: 400, rentalWeeklyRate: 2000, rentalMonthlyRate: 5500 },
    { cat: 'Chicago Pneumatic::Impact Wrenches',    brand: 'Chicago Pneumatic', sku: 'CP-CP7748', modelName: '1/2" Impact Wrench', productType: 'EQUIPMENT', salePrice: 9800, rentalDailyRate: 500, rentalWeeklyRate: 2500, rentalMonthlyRate: 7000 },
    { cat: 'Chicago Pneumatic::Impact Wrenches',    brand: 'Chicago Pneumatic', sku: 'CP-CP7769', modelName: '3/4" Heavy Impact Wrench', productType: 'EQUIPMENT', salePrice: 16500, rentalDailyRate: 800, rentalWeeklyRate: 4000, rentalMonthlyRate: 11000 },
    { cat: 'Enerpac::Hydraulic Jacks',   brand: 'Enerpac', sku: 'ENP-RC50',  modelName: 'Hydraulic Cylinder 50T',       productType: 'EQUIPMENT', salePrice: 28000, rentalDailyRate: 800, rentalWeeklyRate: 4000, rentalMonthlyRate: 11000 },
    { cat: 'Enerpac::Hydraulic Jacks',   brand: 'Enerpac', sku: 'ENP-RC100', modelName: 'Hydraulic Cylinder 100T',      productType: 'EQUIPMENT', salePrice: 48000, rentalDailyRate: 1200, rentalWeeklyRate: 6000, rentalMonthlyRate: 17000 },
    { cat: 'Enerpac::Hydraulic Pumps',   brand: 'Enerpac', sku: 'ENP-PE55',  modelName: 'Electric Hydraulic Pump',      productType: 'EQUIPMENT', salePrice: 38000, rentalDailyRate: 1000, rentalWeeklyRate: 5000, rentalMonthlyRate: 14000, serviceRatePerHour: 800 },
    { cat: 'Enerpac::Torque Tools',      brand: 'Enerpac', sku: 'ENP-W2000', modelName: 'Hydraulic Torque Wrench 2000Nm', productType: 'EQUIPMENT', salePrice: 65000, rentalDailyRate: 1500, rentalWeeklyRate: 7500, rentalMonthlyRate: 22000 },
    { cat: 'Lissmac::Concrete Grinders', brand: 'Lissmac', sku: 'LSM-SWG500', modelName: 'Floor Grinder 500mm',         productType: 'EQUIPMENT', salePrice: 185000, rentalDailyRate: 3500, rentalWeeklyRate: 17500, rentalMonthlyRate: 50000, serviceRatePerHour: 2000 },
    { cat: 'Lissmac::Shot Blasters',     brand: 'Lissmac', sku: 'LSM-SB6000', modelName: 'Shot Blaster 480mm',          productType: 'EQUIPMENT', salePrice: 420000, rentalDailyRate: 7000, rentalWeeklyRate: 35000, rentalMonthlyRate: 100000 },
    { cat: '3M::Abrasives',              brand: '3M', sku: '3M-SC100',  modelName: 'Scotch-Brite Roll 100m',            productType: 'CONSUMABLE', salePrice: 850 },
    { cat: '3M::Abrasives',              brand: '3M', sku: '3M-CW10',   modelName: 'Cubitron Grinding Wheel 115mm',     productType: 'CONSUMABLE', salePrice: 320 },
    { cat: '3M::Respirators & PPE',      brand: '3M', sku: '3M-8210',   modelName: 'N95 Respirator (Box/20)',           productType: 'ACCESSORY', salePrice: 480 },
    { cat: 'Maruzen::Welding Equipment', brand: 'Maruzen', sku: 'MRZ-WE250', modelName: 'MIG Welder 250A',              productType: 'EQUIPMENT', salePrice: 45000, rentalDailyRate: 1200, rentalWeeklyRate: 6000, rentalMonthlyRate: 17000 },
    { cat: 'Maruzen::Welding Wire',      brand: 'Maruzen', sku: 'MRZ-WW08',  modelName: 'MIG Wire 0.8mm 15kg',          productType: 'CONSUMABLE', salePrice: 1200 },
    { cat: 'Gemini::Diamond Blades',     brand: 'Gemini', sku: 'GEM-DB350', modelName: 'Diamond Blade 350mm General',   productType: 'CONSUMABLE', salePrice: 1850 },
    { cat: 'Gemini::Core Bits',          brand: 'Gemini', sku: 'GEM-CB100', modelName: 'Diamond Core Bit 100mm',        productType: 'CONSUMABLE', salePrice: 2800 },
    { cat: 'Rexco::Release Agents',      brand: 'Rexco', sku: 'REX-RA5L',  modelName: 'Form Release Agent 5L',         productType: 'CONSUMABLE', salePrice: 380 },
    { cat: 'Rexco::Curing Compounds',    brand: 'Rexco', sku: 'REX-CC20L', modelName: 'Curing Compound 20L',            productType: 'CONSUMABLE', salePrice: 950 },
    { cat: 'Shirota::Diamond Core Drills', brand: 'Shirota', sku: 'SHR-CD160', modelName: 'Diamond Core Drill 160mm',  productType: 'EQUIPMENT', salePrice: 85000, rentalDailyRate: 2000, rentalWeeklyRate: 10000, rentalMonthlyRate: 28000, serviceRatePerHour: 1500 },
    { cat: 'Shirota::Wall Saws',         brand: 'Shirota', sku: 'SHR-WS800', modelName: 'Electric Wall Saw 800mm',     productType: 'EQUIPMENT', salePrice: 380000, rentalDailyRate: 6000, rentalWeeklyRate: 30000, rentalMonthlyRate: 85000 },
  ]
  const products: Record<string, { id: string; salePrice: number | null; modelName: string }> = {}
  for (const p of productDefs) {
    const catId = cats[p.cat]?.id
    if (!catId) continue
    try {
      const prod = await prisma.product.create({
        data: {
          categoryId: catId, brandId: brands[p.brand].id, sku: p.sku,
          modelName: p.modelName, productType: p.productType,
          salePrice: p.salePrice ?? null, rentalDailyRate: p.rentalDailyRate ?? null,
          rentalWeeklyRate: p.rentalWeeklyRate ?? null, rentalMonthlyRate: p.rentalMonthlyRate ?? null,
          serviceRatePerHour: p.serviceRatePerHour ?? null, isActive: true,
        },
      })
      products[p.sku] = { id: prod.id, salePrice: prod.salePrice, modelName: prod.modelName }
    } catch { /* skip duplicates */ }
  }
  console.log('✓ Products created')

  // ─── Customers ────────────────────────────────────────────────────────────
  const customerDefs = [
    { companyName: 'Siam Construction Co., Ltd.',     industry: 'CONSTRUCTION',       tier: 'VIP' },
    { companyName: 'Thai Precast Industries',          industry: 'CONSTRUCTION',       tier: 'ACTIVE' },
    { companyName: 'Bangkok Metro Development',        industry: 'CONSTRUCTION',       tier: 'ACTIVE' },
    { companyName: 'Eastern Seaboard Factories',       industry: 'INDUSTRIAL_FACTORY', tier: 'ACTIVE' },
    { companyName: 'Rayong Steel Works',               industry: 'INDUSTRIAL_FACTORY', tier: 'VIP' },
    { companyName: 'Northern Roads & Bridges',         industry: 'CONSTRUCTION',       tier: 'PROSPECT' },
    { companyName: 'Udon Thani Concrete Supplies',     industry: 'CONSTRUCTION',       tier: 'PROSPECT' },
    { companyName: 'Chiang Mai Industrial Park',       industry: 'INDUSTRIAL_FACTORY', tier: 'INACTIVE' },
    { companyName: 'Phuket Resort Developments',       industry: 'CONSTRUCTION',       tier: 'ACTIVE' },
    { companyName: 'Hat Yai Port Authority Contractors', industry: 'OTHER',            tier: 'PROSPECT' },
  ]
  const customers: Record<string, { id: string }> = {}
  for (const c of customerDefs) {
    customers[c.companyName] = await prisma.customer.create({
      data: { companyName: c.companyName, industry: c.industry, tier: c.tier },
    })
  }
  console.log('✓ Customers created')

  // ─── Sites ────────────────────────────────────────────────────────────────
  const site1 = await prisma.customerSite.create({ data: {
    customerId: customers['Siam Construction Co., Ltd.'].id,
    siteName: 'Lat Krabang Industrial Site', siteType: 'CONSTRUCTION_SITE',
    province: 'Bangkok', projectStartDate: new Date('2024-01-15'), projectEndDate: new Date('2025-06-30'),
  }})
  const site2 = await prisma.customerSite.create({ data: {
    customerId: customers['Bangkok Metro Development'].id,
    siteName: 'MRT Blue Line Extension', siteType: 'CONSTRUCTION_SITE',
    province: 'Nonthaburi', projectStartDate: new Date('2023-09-01'),
  }})
  const site3 = await prisma.customerSite.create({ data: {
    customerId: customers['Rayong Steel Works'].id,
    siteName: 'Rayong Factory Maintenance', siteType: 'FACTORY',
    province: 'Rayong',
  }})
  const site4 = await prisma.customerSite.create({ data: {
    customerId: customers['Phuket Resort Developments'].id,
    siteName: 'Patong Beach Residences', siteType: 'CONSTRUCTION_SITE',
    province: 'Phuket', projectStartDate: new Date('2024-03-01'),
  }})

  // Site contacts
  await prisma.siteContact.create({ data: { siteId: site1.id, name: 'Thanakorn Srisuk', title: 'Site Manager', phone: '081-234-5678', email: 'thanakorn@siam.co.th', isPrimary: true } })
  await prisma.siteContact.create({ data: { siteId: site2.id, name: 'Wirut Phoomipat', title: 'Project Engineer', phone: '089-876-5432', email: 'wirut@bkkmrt.com', isPrimary: true } })
  await prisma.siteContact.create({ data: { siteId: site3.id, name: 'Siriporn Nakaraj', title: 'Maintenance Director', phone: '038-999-0001', email: 'siriporn@rayongsteel.com', isPrimary: true } })

  console.log('✓ Customers, sites, contacts created')

  // ─── Tags ─────────────────────────────────────────────────────────────────
  const tagUrgent   = await prisma.tag.create({ data: { name: 'Urgent',    color: '#ef4444' } })
  const tagRenewal  = await prisma.tag.create({ data: { name: 'Renewal',   color: '#3b82f6' } })
  const tagKey      = await prisma.tag.create({ data: { name: 'Key Account', color: '#fbbf24' } })
  const tagNew      = await prisma.tag.create({ data: { name: 'New Customer', color: '#22c55e' } })

  // ─── Leads ────────────────────────────────────────────────────────────────
  const leadDefs = [
    { title: 'Plate Compactor Fleet - Lat Krabang',  cust: 'Siam Construction Co., Ltd.',   site: site1.id, rep: rep1, serviceLine: 'RENTAL',  status: 'NEGOTIATION',          priority: 'HIGH',   dealValue: 450000, tags: [tagKey.id] },
    { title: 'Air Compressor Purchase - MRT Site',   cust: 'Bangkok Metro Development',      site: site2.id, rep: rep1, serviceLine: 'SALE',    status: 'QUOTE_SENT',           priority: 'HIGH',   dealValue: 850000 },
    { title: 'Welding Equipment Supply',             cust: 'Rayong Steel Works',             site: site3.id, rep: rep2, serviceLine: 'SALE',    status: 'CLOSED_WON',           priority: 'MEDIUM', dealValue: 320000, tags: [tagRenewal.id] },
    { title: 'Diamond Core Drill Rental',            cust: 'Phuket Resort Developments',     site: site4.id, rep: rep2, serviceLine: 'RENTAL',  status: 'SITE_VISIT_SCHEDULED', priority: 'MEDIUM', dealValue: 180000 },
    { title: 'Generator Rental - Thai Precast',      cust: 'Thai Precast Industries',        site: null,    rep: rep3, serviceLine: 'RENTAL',  status: 'CONTACTED',            priority: 'LOW',    dealValue: 120000 },
    { title: 'Grinder Service Contract - Rayong',    cust: 'Rayong Steel Works',             site: site3.id, rep: rep2, serviceLine: 'SERVICE', status: 'NEW',                  priority: 'MEDIUM', dealValue: 96000,  tags: [tagKey.id] },
    { title: 'Power Tool Kit Purchase',              cust: 'Eastern Seaboard Factories',     site: null,    rep: rep1, serviceLine: 'SALE',    status: 'CONTACTED',            priority: 'LOW',    dealValue: 35000,  tags: [tagNew.id] },
    { title: 'Hydraulic Jack Hire - Bridge Project', cust: 'Northern Roads & Bridges',       site: null,    rep: rep3, serviceLine: 'RENTAL',  status: 'NEW',                  priority: 'URGENT', dealValue: 220000, tags: [tagUrgent.id] },
    { title: 'Concrete Admixture Supply',            cust: 'Udon Thani Concrete Supplies',   site: null,    rep: rep3, serviceLine: 'SALE',    status: 'CLOSED_LOST',          priority: 'LOW',    dealValue: 45000 },
    { title: 'Compressor Maintenance Contract',      cust: 'Siam Construction Co., Ltd.',   site: site1.id, rep: rep1, serviceLine: 'SERVICE', status: 'CLOSED_WON',           priority: 'HIGH',   dealValue: 180000 },
  ]

  const leads: { id: string }[] = []
  for (const l of leadDefs) {
    const lead = await prisma.lead.create({
      data: {
        title: l.title,
        customerId: customers[l.cust].id,
        siteId: l.site,
        serviceLine: l.serviceLine,
        status: l.status,
        priority: l.priority,
        dealValue: l.dealValue,
        assignedToId: l.rep.id,
        createdById: manager.id,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
    if (l.tags) {
      for (const tagId of l.tags) {
        await prisma.leadTag.create({ data: { leadId: lead.id, tagId } })
      }
    }
    leads.push(lead)
  }
  console.log('✓ Leads created')

  // ─── Activities ───────────────────────────────────────────────────────────
  const activityDefs = [
    { leadIdx: 0, userId: rep1.id, type: 'CALL',       subject: 'Initial rental discussion', completedAt: new Date('2025-03-10'), outcome: 'Customer interested, sending details' },
    { leadIdx: 0, userId: rep1.id, type: 'SITE_VISIT', subject: 'Site assessment - Lat Krabang', completedAt: new Date('2025-03-18'), outcome: 'Need 3 units for 6 months' },
    { leadIdx: 1, userId: rep1.id, type: 'CALL',       subject: 'Quote follow-up call', scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    { leadIdx: 2, userId: rep2.id, type: 'MEETING',    subject: 'Contract signing', completedAt: new Date('2025-02-28'), outcome: 'Signed PO for MIG welder set' },
    { leadIdx: 3, userId: rep2.id, type: 'SITE_VISIT', subject: 'Site visit - Patong', scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { leadIdx: 5, userId: rep2.id, type: 'EMAIL',      subject: 'Service contract proposal sent', completedAt: new Date('2025-03-20'), outcome: 'Awaiting response' },
    { leadIdx: 7, userId: rep3.id, type: 'CALL',       subject: 'Urgent bridge project inquiry', completedAt: new Date('2025-03-22'), outcome: 'Need hydraulic jacks ASAP' },
  ]
  for (const a of activityDefs) {
    await prisma.activity.create({
      data: {
        leadId: leads[a.leadIdx].id, userId: a.userId, type: a.type,
        subject: a.subject, outcome: a.outcome ?? null,
        scheduledAt: a.scheduledAt ?? null, completedAt: a.completedAt ?? null,
      },
    })
  }
  console.log('✓ Activities created')

  // ─── Quotes ───────────────────────────────────────────────────────────────
  const compressorProduct = products['ATC-GA22']
  const compressorProduct2 = products['ATC-GA37']
  const welderProduct = products['MRZ-WE250']

  if (compressorProduct && compressorProduct2) {
    const li1Price = compressorProduct.salePrice ?? 285000
    const li2Price = compressorProduct2.salePrice ?? 420000
    const subtotal = li1Price + li2Price * 2
    const tax = Math.round(subtotal * 0.07)
    await prisma.quote.create({
      data: {
        leadId: leads[1].id,
        quoteNumber: `QT-2025-0001`,
        version: 1, status: 'SENT',
        subtotal, taxRate: 7, taxAmount: tax, discount: 0, total: subtotal + tax,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lineItems: {
          create: [
            { description: compressorProduct.modelName, qty: 1, unitPrice: li1Price, discount: 0, subtotal: li1Price, productId: compressorProduct.id },
            { description: compressorProduct2.modelName, qty: 2, unitPrice: li2Price, discount: 0, subtotal: li2Price * 2, productId: compressorProduct2.id },
          ],
        },
      },
    })
  }

  if (welderProduct) {
    const unitPrice = welderProduct.salePrice ?? 45000
    const qty = 2
    const subtotal = unitPrice * qty
    const discount = 5000
    const discSubtotal = subtotal - discount
    const tax = Math.round(discSubtotal * 0.07)
    await prisma.quote.create({
      data: {
        leadId: leads[2].id,
        quoteNumber: `QT-2025-0002`,
        version: 1, status: 'ACCEPTED',
        subtotal, taxRate: 7, taxAmount: tax, discount, total: discSubtotal + tax,
        lineItems: {
          create: [
            { description: welderProduct.modelName, qty, unitPrice, discount: 0, subtotal, productId: welderProduct.id },
          ],
        },
      },
    })
  }
  console.log('✓ Quotes created')

  // ─── Targets ──────────────────────────────────────────────────────────────
  const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const targetDefs = [
    { userId: rep1.id, targetValue: 2000000 },
    { userId: rep2.id, targetValue: 1500000 },
    { userId: rep3.id, targetValue: 1000000 },
  ]
  for (const t of targetDefs) {
    await prisma.target.create({ data: { ...t, period, targetType: 'REVENUE' } })
  }
  console.log('✓ Targets created')

  // ─── Audit Log Samples ────────────────────────────────────────────────────
  await prisma.auditLog.create({ data: { userId: admin.id, action: 'CREATE', entityType: 'User', entityId: rep1.id, newValue: JSON.stringify({ email: 'rep1@demo.com', role: 'REP' }) } })
  await prisma.auditLog.create({ data: { userId: manager.id, action: 'CREATE', entityType: 'Lead', entityId: leads[0].id, newValue: JSON.stringify({ title: leads[0] }) } })

  console.log('\n✅ Seed complete!')
  console.log('\nDemo accounts:')
  console.log('  admin@demo.com   / Admin123!')
  console.log('  manager@demo.com / Manager123!')
  console.log('  pm.heavy@demo.com / PM123!')
  console.log('  rep1@demo.com    / Rep123!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
