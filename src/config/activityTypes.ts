/**
 * Cozero activity taxonomy reference.
 *
 * Defines the valid category → subcategory → activity combinations
 * and their Cozero platform IDs. This is the reference data that
 * gets seeded into the ActivityTaxonomy database table.
 *
 * Source: scope_3_activity_ids tab from the Google Sheets config.
 */

import type { ActivityEntry } from '@/types/config';

export const ACTIVITY_TAXONOMY: ActivityEntry[] = [
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

  // Employee commuting (for credit card fuel purchases)
  { categoryName: 'Employee commuting', categoryId: 4, subcategoryName: 'Passenger car commute', subcategoryId: 76, activityName: 'Average car - Petrol', activityId: 193 },

  // Purchased goods (Office goods in Cozero)
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

/** Build an activity lookup map keyed by activity name (case-insensitive). */
export function buildActivityLookup(entries: ActivityEntry[]): Map<string, ActivityEntry> {
  const map = new Map<string, ActivityEntry>();
  for (const entry of entries) {
    map.set(entry.activityName.toUpperCase(), entry);
  }
  return map;
}
