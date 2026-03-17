/**
 * MCC (Merchant Category Code) description → Cozero category mapping rules.
 * Used by the credit card pipeline to categorise ~85-90% of transactions
 * before supplier mapping or AI.
 *
 * Rules are matched in order — first match wins.
 * Match is case-insensitive substring against the MCC Description field.
 */

import type { MccRule } from '@/types/config';

export const MCC_RULES: MccRule[] = [
  // Out of scope
  { pattern: 'parking', matchType: 'contains', logCategory: 'Out of scope', logSubcategory: 'Out of scope', businessActivity: 'Out of scope', pipelineReason: 'MCC: Parking → Out of scope' },

  // Food
  { pattern: 'eating places', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Office food', businessActivity: 'Food', pipelineReason: 'MCC: Eating Places → Food' },
  { pattern: 'fast food', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Office food', businessActivity: 'Food', pipelineReason: 'MCC: Fast Food → Food' },
  { pattern: 'grocery stores', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Office food', businessActivity: 'Food', pipelineReason: 'MCC: Grocery Stores → Food' },
  { pattern: 'catering', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Office food', businessActivity: 'Food', pipelineReason: 'MCC: Catering → Food' },
  { pattern: 'bakeries', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Office food', businessActivity: 'Food', pipelineReason: 'MCC: Bakeries → Food' },
  { pattern: 'candy, nut', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Office food', businessActivity: 'Food', pipelineReason: 'MCC: Candy/Nut stores → Food' },
  { pattern: 'convenience stores', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Office food', businessActivity: 'Food', pipelineReason: 'MCC: Convenience Stores → Food' },

  // Drink
  { pattern: 'drinking places', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Drink', businessActivity: 'Drink', pipelineReason: 'MCC: Drinking Places → Drink' },
  { pattern: 'package stores-beer', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Drink', businessActivity: 'Drink', pipelineReason: 'MCC: Package Stores/Beer → Drink' },

  // Travel — Rail
  { pattern: 'passenger railways', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Rail travel', businessActivity: 'Rail', pipelineReason: 'MCC: Passenger Railways → Rail' },
  { pattern: 'commuter transport', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Rail travel', businessActivity: 'Rail', pipelineReason: 'MCC: Commuter Transport → Rail' },

  // Travel — Taxi
  { pattern: 'taxicabs', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Taxi travel', businessActivity: 'Taxi', pipelineReason: 'MCC: Taxicabs → Taxi' },
  { pattern: 'limousines', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Taxi travel', businessActivity: 'Taxi', pipelineReason: 'MCC: Limousines → Taxi' },

  // Travel — Hotels
  { pattern: 'hotels, motels', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Hotel stay', businessActivity: 'Hotel stay', pipelineReason: 'MCC: Hotels/Motels → Hotel stay' },
  { pattern: 'marriott', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Hotel stay', businessActivity: 'Hotel stay', pipelineReason: 'MCC: Marriott → Hotel stay' },
  { pattern: 'hilton', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Hotel stay', businessActivity: 'Hotel stay', pipelineReason: 'MCC: Hilton → Hotel stay' },
  { pattern: 'premier inn', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Hotel stay', businessActivity: 'Hotel stay', pipelineReason: 'MCC: Premier Inn → Hotel stay' },
  { pattern: 'premier travel inn', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Hotel stay', businessActivity: 'Hotel stay', pipelineReason: 'MCC: Premier Travel Inn → Hotel stay' },
  { pattern: 'hyatt', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Hotel stay', businessActivity: 'Hotel stay', pipelineReason: 'MCC: Hyatt → Hotel stay' },
  { pattern: 'travelodge', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Hotel stay', businessActivity: 'Hotel stay', pipelineReason: 'MCC: Travelodge → Hotel stay' },

  // Travel — Flights (airline-specific)
  { pattern: 'british airways', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Flight travel', businessActivity: 'Flights', pipelineReason: 'MCC: British Airways → Flights' },
  { pattern: 'virgin atlantic', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Flight travel', businessActivity: 'Flights', pipelineReason: 'MCC: Virgin Atlantic → Flights' },
  { pattern: 'easyjet', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Flight travel', businessActivity: 'Flights', pipelineReason: 'MCC: EasyJet → Flights' },
  { pattern: 'aer lingus', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Flight travel', businessActivity: 'Flights', pipelineReason: 'MCC: Aer Lingus → Flights' },
  { pattern: 'spirit airlines', matchType: 'contains', logCategory: 'Business travel', logSubcategory: 'Flight travel', businessActivity: 'Flights', pipelineReason: 'MCC: Spirit Airlines → Flights' },

  // Travel — Agency
  { pattern: 'travel agencies', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'Professional services', businessActivity: 'Travel agency services', pipelineReason: 'MCC: Travel Agencies → Travel agency services' },

  // Software / IT
  { pattern: 'computer software', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'ICT services', businessActivity: 'Software', pipelineReason: 'MCC: Computer Software → Software' },
  { pattern: 'computer network', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'Servers', businessActivity: 'Data processing and hosting', pipelineReason: 'MCC: Computer Network → Data processing' },
  { pattern: 'computer programming', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'ICT services', businessActivity: 'Software', pipelineReason: 'MCC: Computer Programming → Software' },
  { pattern: 'digital goods', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'ICT services', businessActivity: 'Software', pipelineReason: 'MCC: Digital Goods → Software' },

  // Office equipment
  { pattern: 'computers, peripherals', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Office equipment', businessActivity: 'Electrical items and IT', pipelineReason: 'MCC: Computers/Peripherals → IT equipment' },
  { pattern: 'office stationery', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Office materials', businessActivity: 'Office materials', pipelineReason: 'MCC: Office Stationery → Office materials' },

  // Couriers
  { pattern: 'postal services', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'Professional services', businessActivity: 'Couriers and messengers', pipelineReason: 'MCC: Postal Services → Couriers' },
  { pattern: 'courier', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'Professional services', businessActivity: 'Couriers and messengers', pipelineReason: 'MCC: Courier → Couriers' },

  // Financial
  { pattern: 'financial services', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'Professional services', businessActivity: 'Financial services', pipelineReason: 'MCC: Financial Services → Financial services' },

  // Telecoms
  { pattern: 'telecommunication', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'ICT services', businessActivity: 'Telephone and Internet accounts and services', pipelineReason: 'MCC: Telecommunication → Telephone/Internet' },

  // Fuel (car travel)
  { pattern: 'automotive fuel', matchType: 'contains', logCategory: 'Employee commuting', logSubcategory: 'Passenger car commute', businessActivity: 'Average car - Petrol', pipelineReason: 'MCC: Automotive Fuel → Petrol car' },
  { pattern: 'service stations', matchType: 'contains', logCategory: 'Employee commuting', logSubcategory: 'Passenger car commute', businessActivity: 'Average car - Petrol', pipelineReason: 'MCC: Service Stations → Petrol car' },

  // Printing
  { pattern: 'quick copy', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'Professional services', businessActivity: 'Printing services', pipelineReason: 'MCC: Quick Copy → Printing' },
  { pattern: 'blueprint', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'Professional services', businessActivity: 'Printing services', pipelineReason: 'MCC: Blueprint → Printing' },

  // Florists / plants
  { pattern: 'florists', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Other office goods', businessActivity: 'Plants, flowers and seeds', pipelineReason: 'MCC: Florists → Plants/flowers' },
  { pattern: 'nurseries, lawn', matchType: 'contains', logCategory: 'Office goods', logSubcategory: 'Other office goods', businessActivity: 'Plants, flowers and seeds', pipelineReason: 'MCC: Nurseries → Plants/flowers' },

  // Equipment rental
  { pattern: 'equipment rental', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'Professional services', businessActivity: 'Rental services of equipment', pipelineReason: 'MCC: Equipment Rental → Rental services' },
];

/**
 * Supplier-based rules for credit card pipeline (where MCC is uninformative).
 * Checked before MCC rules. Case-insensitive substring match on supplier name.
 */
export const CC_SUPPLIER_RULES: MccRule[] = [
  { pattern: 'card fee', matchType: 'contains', logCategory: 'Purchased services', logSubcategory: 'Professional services', businessActivity: 'Financial services', pipelineReason: 'Supplier: CARD FEE → Financial services' },
];
