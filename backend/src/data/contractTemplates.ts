import type { TradeValue } from '@korrectng/shared';

export interface MilestoneTemplate {
  order: number;
  name: string;
  description: string;
  percentage: number;
  triggerCondition: string;
}

export interface ContractTemplate {
  trade: TradeValue;
  defaultMilestones: MilestoneTemplate[];
  commonDeliverables: string[];
  commonExclusions: string[];
  materialsNote: string;
}

// Default 30-40-30 milestone split for all trades
const DEFAULT_MILESTONES: MilestoneTemplate[] = [
  {
    order: 1,
    name: 'Project Initiation',
    description: 'Initial deposit to commence work. Artisan procures materials and begins preparation.',
    percentage: 30,
    triggerCondition: 'Contract signed by both parties',
  },
  {
    order: 2,
    name: 'Midpoint Progress',
    description: 'Work is approximately 50% complete. Major components are installed or assembled.',
    percentage: 40,
    triggerCondition: 'Customer confirms work progress at midpoint',
  },
  {
    order: 3,
    name: 'Project Completion',
    description: 'All work completed, tested, and ready for final inspection.',
    percentage: 30,
    triggerCondition: 'Customer confirms satisfactory completion and signs off',
  },
];

export const contractTemplates: Record<TradeValue, ContractTemplate> = {
  mechanic: {
    trade: 'mechanic',
    defaultMilestones: [
      {
        order: 1,
        name: 'Diagnosis & Parts Procurement',
        description: 'Initial diagnosis complete. Deposit for parts procurement.',
        percentage: 30,
        triggerCondition: 'Diagnosis report provided and approved',
      },
      {
        order: 2,
        name: 'Repair In Progress',
        description: 'Major repairs underway. Parts installed.',
        percentage: 40,
        triggerCondition: 'Customer confirms parts installed and repair in progress',
      },
      {
        order: 3,
        name: 'Completion & Testing',
        description: 'All repairs complete. Vehicle tested and ready for pickup.',
        percentage: 30,
        triggerCondition: 'Customer test drives and confirms satisfaction',
      },
    ],
    commonDeliverables: [
      'Complete diagnostic report',
      'Replacement of specified faulty parts',
      'Test drive to confirm repairs',
      'Warranty on parts and labor (30 days)',
    ],
    commonExclusions: [
      'Pre-existing damage not related to current repair',
      'Additional faults discovered during repair (requires separate quote)',
      'Consumables (fuel, fluids) unless specified',
    ],
    materialsNote: 'Parts can be provided by customer or sourced by artisan with customer approval.',
  },

  electrician: {
    trade: 'electrician',
    defaultMilestones: DEFAULT_MILESTONES,
    commonDeliverables: [
      'Complete electrical work as specified',
      'All connections properly insulated and secured',
      'Testing of all circuits and points',
      'Safety certification if applicable',
    ],
    commonExclusions: [
      'Structural modifications (breaking walls, etc.)',
      'Appliance installation unless specified',
      'NEPA/PHCN meter-related work',
    ],
    materialsNote: 'Electrical materials (cables, switches, breakers) typically provided by artisan with prior cost approval.',
  },

  plumber: {
    trade: 'plumber',
    defaultMilestones: DEFAULT_MILESTONES,
    commonDeliverables: [
      'Installation/repair of specified plumbing fixtures',
      'Leak testing of all connections',
      'Clean-up of work area',
      'Demonstration of proper function',
    ],
    commonExclusions: [
      'Floor/wall tiling',
      'Waterproofing unless specified',
      'Septic tank or soakaway construction',
    ],
    materialsNote: 'Major fixtures (WC, sink, shower) typically provided by customer. Pipes and fittings by artisan.',
  },

  'ac-tech': {
    trade: 'ac-tech',
    defaultMilestones: [
      {
        order: 1,
        name: 'Site Assessment & Preparation',
        description: 'Site inspection, piping route planning, and bracket installation.',
        percentage: 30,
        triggerCondition: 'Installation plan approved by customer',
      },
      {
        order: 2,
        name: 'Unit Installation',
        description: 'Indoor and outdoor unit mounting, copper piping, and drainage setup.',
        percentage: 40,
        triggerCondition: 'Both units mounted and connected',
      },
      {
        order: 3,
        name: 'Testing & Commissioning',
        description: 'Gas charging, electrical connection, testing all functions.',
        percentage: 30,
        triggerCondition: 'AC fully functional, customer trained on operation',
      },
    ],
    commonDeliverables: [
      'Complete AC installation/servicing',
      'Proper drainage setup',
      'Electrical connection to dedicated circuit',
      'User demonstration and handover',
    ],
    commonExclusions: [
      'Electrical circuit installation (separate electrical work)',
      'Building modifications for drainage',
      'AC unit cost (if installation only)',
    ],
    materialsNote: 'Installation materials (copper pipe, gas, brackets) typically included in service quote.',
  },

  'generator-tech': {
    trade: 'generator-tech',
    defaultMilestones: DEFAULT_MILESTONES,
    commonDeliverables: [
      'Generator repair/servicing as specified',
      'Testing under load',
      'Oil and filter change if applicable',
      'Operation demonstration',
    ],
    commonExclusions: [
      'Major engine overhaul (requires separate quote)',
      'ATS/changeover installation',
      'Fuel tank installation',
    ],
    materialsNote: 'Consumables (oil, filters, spark plugs) typically provided by artisan with prior cost approval.',
  },

  'phone-repair': {
    trade: 'phone-repair',
    defaultMilestones: [
      {
        order: 1,
        name: 'Diagnosis',
        description: 'Complete device diagnosis and repair cost confirmation.',
        percentage: 30,
        triggerCondition: 'Customer approves repair cost estimate',
      },
      {
        order: 2,
        name: 'Repair',
        description: 'Parts replacement and repair work.',
        percentage: 40,
        triggerCondition: 'Repair completed, awaiting customer testing',
      },
      {
        order: 3,
        name: 'Testing & Handover',
        description: 'Customer tests device and confirms satisfaction.',
        percentage: 30,
        triggerCondition: 'Customer confirms device working properly',
      },
    ],
    commonDeliverables: [
      'Complete repair of specified issue',
      'Quality replacement parts',
      'Device testing before handover',
      'Warranty on repair (14-30 days)',
    ],
    commonExclusions: [
      'Data backup/recovery',
      'Software issues unrelated to repair',
      'Water damage (if not specified)',
    ],
    materialsNote: 'Replacement parts (screens, batteries) provided by artisan. Quality grade to be confirmed before repair.',
  },

  tailor: {
    trade: 'tailor',
    defaultMilestones: [
      {
        order: 1,
        name: 'Measurement & Design',
        description: 'Measurements taken, design confirmed, fabric received.',
        percentage: 30,
        triggerCondition: 'Design sketch approved, fabric received',
      },
      {
        order: 2,
        name: 'Cutting & Assembly',
        description: 'Fabric cut and initial assembly for fitting.',
        percentage: 40,
        triggerCondition: 'First fitting completed',
      },
      {
        order: 3,
        name: 'Final Fitting & Delivery',
        description: 'Final adjustments and delivery of completed outfit.',
        percentage: 30,
        triggerCondition: 'Customer accepts finished product',
      },
    ],
    commonDeliverables: [
      'Custom outfit as per agreed design',
      'Quality stitching and finishing',
      'Fitting sessions as needed',
      'Minor alterations within 7 days',
    ],
    commonExclusions: [
      'Fabric/material cost (unless package deal)',
      'Accessories (buttons, zippers) if not included',
      'Design changes after cutting',
    ],
    materialsNote: 'Fabric typically provided by customer. Accessories and thread by tailor unless specified otherwise.',
  },

  carpenter: {
    trade: 'carpenter',
    defaultMilestones: [
      {
        order: 1,
        name: 'Design & Material Procurement',
        description: 'Design finalized, materials procured or received.',
        percentage: 30,
        triggerCondition: 'Design approved, materials on site',
      },
      {
        order: 2,
        name: 'Construction',
        description: 'Main construction and assembly work.',
        percentage: 40,
        triggerCondition: 'Structure/furniture assembled',
      },
      {
        order: 3,
        name: 'Finishing & Installation',
        description: 'Sanding, finishing, hardware installation.',
        percentage: 30,
        triggerCondition: 'Customer approves finished product',
      },
    ],
    commonDeliverables: [
      'Custom furniture/woodwork as specified',
      'Quality wood and finishing',
      'Proper hardware installation',
      'On-site installation if applicable',
    ],
    commonExclusions: [
      'Upholstery work',
      'Glass/mirror installation',
      'Electrical fittings (handles by electrician)',
    ],
    materialsNote: 'Wood and materials can be provided by customer or sourced by carpenter with prior approval.',
  },

  painter: {
    trade: 'painter',
    defaultMilestones: [
      {
        order: 1,
        name: 'Preparation',
        description: 'Surface preparation, filling, sanding.',
        percentage: 30,
        triggerCondition: 'Surfaces prepared and ready for painting',
      },
      {
        order: 2,
        name: 'First Coats',
        description: 'Primer and first coat application.',
        percentage: 40,
        triggerCondition: 'First coat completed',
      },
      {
        order: 3,
        name: 'Final Coats & Clean-up',
        description: 'Final coats, touch-ups, and area clean-up.',
        percentage: 30,
        triggerCondition: 'Painting complete, customer satisfied',
      },
    ],
    commonDeliverables: [
      'Complete painting of specified areas',
      'Proper surface preparation',
      'Multiple coats as needed',
      'Clean edges and finish',
    ],
    commonExclusions: [
      'Wall repairs/plastering',
      'Ceiling repairs',
      'Moving furniture (customer responsibility)',
    ],
    materialsNote: 'Paint typically provided by customer. Primer, filler, and supplies by painter unless specified.',
  },

  welder: {
    trade: 'welder',
    defaultMilestones: DEFAULT_MILESTONES,
    commonDeliverables: [
      'Complete welding/fabrication as specified',
      'Quality welds with proper penetration',
      'Grinding and finishing of welds',
      'Rust protection/painting if specified',
    ],
    commonExclusions: [
      'Material procurement (unless quoted)',
      'Structural engineering certification',
      'Installation at height (requires scaffolding)',
    ],
    materialsNote: 'Metal materials typically provided by customer. Welding consumables (rods, gas) by artisan.',
  },
};

// Get template for a specific trade
export function getContractTemplate(trade: TradeValue): ContractTemplate {
  return contractTemplates[trade];
}

// Get default milestones for any trade
export function getDefaultMilestones(): MilestoneTemplate[] {
  return DEFAULT_MILESTONES;
}

export default contractTemplates;
