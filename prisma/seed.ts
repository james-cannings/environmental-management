import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // ── Agencies ──────────────────────────────────────────
  const agencies = [
    { name: '26 PMX + Miri', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['26 PMX', 'Miri']) },
    { name: 'Big Spaceship', country: 'United States', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Big Spaceship']) },
    { name: 'Elmwood China', country: 'China', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Elmwood China', 'Elmwood Shanghai']) },
    { name: 'Elmwood Singapore', country: 'Singapore', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Elmwood Singapore']) },
    { name: 'Elmwood UK', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Elmwood UK']) },
    { name: 'Elmwood US', country: 'United States', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Elmwood US']) },
    { name: 'Freemavens', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Freemavens']) },
    { name: 'M3 Labs', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['M3 Labs']) },
    { name: 'MSQ DX Europe', country: 'Germany', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['MSQ DX Europe']) },
    { name: 'MSQ DX UK', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['MSQ DX UK', 'MMT Digital']) },
    { name: 'MSQ Partners Central', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['MSQ Partners Central', 'MSQ Partners Ltd', 'MSQ Partners', 'Marvel BidCo', 'Ensco 1317 Ltd']) },
    { name: 'MSQ Sport + Entertainment', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['MSQ Sport + Entertainment']) },
    { name: 'Smarts Netherlands', country: 'Netherlands', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Smarts Netherlands']) },
    { name: 'Smarts UK', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Smarts UK', 'Smarts Belfast']) },
    { name: 'Smarts US', country: 'United States', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Smarts US']) },
    { name: 'Stein IAS UK', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Stein IAS UK']) },
    { name: 'Stein IAS US', country: 'United States', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Stein IAS US']) },
    { name: 'The Gate UK', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['The Gate UK']) },
    { name: 'The Gate US', country: 'United States', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['The Gate US']) },
    { name: 'Walk-In Media', country: 'United Kingdom', cozeroLocationId: null, cozeroBusinessUnitId: null, cozeroTerritoryId: null, dbNames: JSON.stringify(['Walk-In Media']) },
  ];

  for (const agency of agencies) {
    await prisma.agency.upsert({
      where: { name: agency.name },
      update: { country: agency.country, dbNames: agency.dbNames },
      create: agency,
    });
  }
  console.log(`Seeded ${agencies.length} agencies`);

  // ── Activity Taxonomy ─────────────────────────────────
  const activities = [
    // Business travel
    { categoryName: 'Business travel', categoryId: 3, subcategoryName: 'Flight travel', subcategoryId: 73, activityName: 'Flights', activityId: 187 },
    { categoryName: 'Business travel', categoryId: 3, subcategoryName: 'Hotel stay', subcategoryId: 74, activityName: 'Hotel stay', activityId: 189 },
    { categoryName: 'Business travel', categoryId: 3, subcategoryName: 'Taxi travel', subcategoryId: 75, activityName: 'Taxi', activityId: 190 },
    { categoryName: 'Business travel', categoryId: 3, subcategoryName: 'Rail travel', subcategoryId: 70, activityName: 'Rail', activityId: 242 },
    { categoryName: 'Business travel', categoryId: 3, subcategoryName: 'Rail travel', subcategoryId: 70, activityName: 'National rail', activityId: 242 },
    { categoryName: 'Business travel', categoryId: 3, subcategoryName: 'Bus travel', subcategoryId: 69, activityName: 'Bus', activityId: 188 },
    { categoryName: 'Business travel', categoryId: 3, subcategoryName: 'Ferry travel', subcategoryId: 71, activityName: 'Ferry', activityId: 243 },
    { categoryName: 'Business travel', categoryId: 3, subcategoryName: 'Passenger car travel', subcategoryId: 72, activityName: 'Average car - Petrol', activityId: 191 },
    { categoryName: 'Business travel', categoryId: 3, subcategoryName: 'Passenger car travel', subcategoryId: 72, activityName: 'Average car - Battery electric vehicle', activityId: 192 },
    // Employee commuting
    { categoryName: 'Employee commuting', categoryId: 4, subcategoryName: 'Passenger car commute', subcategoryId: 76, activityName: 'Average car - Petrol (commute)', activityId: 193 },
    // Purchased goods (Office goods)
    { categoryName: 'Office goods', categoryId: 1, subcategoryName: 'Office food', subcategoryId: 60, activityName: 'Food', activityId: 170 },
    { categoryName: 'Office goods', categoryId: 1, subcategoryName: 'Drink', subcategoryId: 61, activityName: 'Drink', activityId: 171 },
    { categoryName: 'Office goods', categoryId: 1, subcategoryName: 'Office equipment', subcategoryId: 62, activityName: 'Electrical items and IT', activityId: 172 },
    { categoryName: 'Office goods', categoryId: 1, subcategoryName: 'Office equipment', subcategoryId: 62, activityName: 'Furniture', activityId: 173 },
    { categoryName: 'Office goods', categoryId: 1, subcategoryName: 'Office materials', subcategoryId: 63, activityName: 'Office materials', activityId: 174 },
    { categoryName: 'Office goods', categoryId: 1, subcategoryName: 'Other office goods', subcategoryId: 64, activityName: 'Plants, flowers and seeds', activityId: 175 },
    // Purchased services
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'ICT services', subcategoryId: 65, activityName: 'Software', activityId: 176 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'ICT services', subcategoryId: 65, activityName: 'Telephone and Internet accounts and services', activityId: 177 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Servers', subcategoryId: 66, activityName: 'Data processing and hosting', activityId: 178 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Employment services', activityId: 179 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Advertising', activityId: 180 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Entertainment and events services', activityId: 181 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Education services', activityId: 182 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Legal services', activityId: 183 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Insurance services', activityId: 184 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Facilities support services', activityId: 185 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Couriers and messengers', activityId: 186 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Repair and installation', activityId: 194 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Membership organisations', activityId: 195 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Management consulting', activityId: 196 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Financial services', activityId: 197 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Accounting services', activityId: 198 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Central government administrative services', activityId: 199 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Printing services', activityId: 200 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Rental services of equipment', activityId: 201 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Health services', activityId: 202 },
    { categoryName: 'Purchased services', categoryId: 2, subcategoryName: 'Professional services', subcategoryId: 67, activityName: 'Travel agency services', activityId: 203 },
  ];

  for (const act of activities) {
    await prisma.activityTaxonomy.upsert({
      where: { activityName: act.activityName },
      update: {
        categoryName: act.categoryName,
        categoryId: act.categoryId,
        subcategoryName: act.subcategoryName,
        subcategoryId: act.subcategoryId,
        activityId: act.activityId,
      },
      create: act,
    });
  }
  console.log(`Seeded ${activities.length} activity taxonomy entries`);

  // ── Calculation Methods ───────────────────────────────
  const calcMethods = [
    { key: 'spend', cozeroId: 45, label: 'Spend-based (GBP)' },
    { key: 'employee-distance', cozeroId: 40, label: 'Employee distance' },
    { key: 'nights', cozeroId: 4, label: 'Hotel nights' },
  ];

  for (const method of calcMethods) {
    await prisma.calculationMethod.upsert({
      where: { key: method.key },
      update: { cozeroId: method.cozeroId, label: method.label },
      create: method,
    });
  }
  console.log(`Seeded ${calcMethods.length} calculation methods`);

  // ── Units ─────────────────────────────────────────────
  const units = [
    { key: 'GBP', cozeroId: 40, label: 'British Pounds' },
    { key: 'mile', cozeroId: 14, label: 'Miles' },
    { key: 'km', cozeroId: 16, label: 'Kilometres' },
    { key: 'room night', cozeroId: 628, label: 'Room nights' },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { key: unit.key },
      update: { cozeroId: unit.cozeroId, label: unit.label },
      create: unit,
    });
  }
  console.log(`Seeded ${units.length} units`);

  // ── Territory Mappings ────────────────────────────────
  const territories = [
    { countryCode: 'GB', cozeroId: 240, countryName: 'United Kingdom' },
    { countryCode: 'US', cozeroId: 241, countryName: 'United States' },
    { countryCode: 'DE', cozeroId: 83, countryName: 'Germany' },
    { countryCode: 'NL', cozeroId: 160, countryName: 'Netherlands' },
    { countryCode: 'ES', cozeroId: 212, countryName: 'Spain' },
    { countryCode: 'SE', cozeroId: 218, countryName: 'Sweden' },
    { countryCode: 'IN', cozeroId: 103, countryName: 'India' },
    { countryCode: 'IE', cozeroId: 108, countryName: 'Ireland' },
    { countryCode: 'FR', cozeroId: 79, countryName: 'France' },
    { countryCode: 'AU', cozeroId: 14, countryName: 'Australia' },
    { countryCode: 'JP', cozeroId: 114, countryName: 'Japan' },
    { countryCode: 'DK', cozeroId: 61, countryName: 'Denmark' },
    { countryCode: 'CN', cozeroId: 46, countryName: 'China' },
    { countryCode: 'SG', cozeroId: 205, countryName: 'Singapore' },
    { countryCode: 'MY', cozeroId: 146, countryName: 'Malaysia' },
    { countryCode: 'KH', cozeroId: 36, countryName: 'Cambodia' },
    { countryCode: 'VN', cozeroId: 249, countryName: 'Vietnam' },
    { countryCode: 'AE', cozeroId: 236, countryName: 'United Arab Emirates' },
    { countryCode: 'ID', cozeroId: 102, countryName: 'Indonesia' },
    { countryCode: 'TH', cozeroId: 227, countryName: 'Thailand' },
    { countryCode: 'HK', cozeroId: 97, countryName: 'Hong Kong' },
    { countryCode: 'MO', cozeroId: 140, countryName: 'Macau' },
    { countryCode: 'PH', cozeroId: 178, countryName: 'Philippines' },
    { countryCode: 'PT', cozeroId: 182, countryName: 'Portugal' },
    { countryCode: 'NG', cozeroId: 163, countryName: 'Nigeria' },
  ];

  for (const territory of territories) {
    await prisma.territoryMapping.upsert({
      where: { countryCode: territory.countryCode },
      update: { cozeroId: territory.cozeroId, countryName: territory.countryName },
      create: territory,
    });
  }
  console.log(`Seeded ${territories.length} territory mappings`);

  console.log('Seed complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
