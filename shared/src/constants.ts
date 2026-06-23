export const TRADES = [
  { value: 'mechanic', label: 'Auto Mechanic', icon: '🔧' },
  { value: 'electrician', label: 'Electrician', icon: '⚡' },
  { value: 'plumber', label: 'Plumber', icon: '🔧' },
  { value: 'ac-tech', label: 'AC Technician', icon: '❄️' },
  { value: 'generator-tech', label: 'Generator Technician', icon: '⚙️' },
  { value: 'phone-repair', label: 'Phone Repairer', icon: '📱' },
  { value: 'tailor', label: 'Tailor', icon: '🧵' },
  { value: 'carpenter', label: 'Carpenter', icon: '🪚' },
  { value: 'painter', label: 'Painter', icon: '🎨' },
  { value: 'welder', label: 'Welder', icon: '🔥' },
  { value: 'hair-stylist', label: 'Hair Stylist', icon: '💇' },
  { value: 'barber', label: 'Barber', icon: '💈' },
  { value: 'tiler', label: 'Tiler', icon: '🔲' },
  { value: 'pop-installer', label: 'POP Installer', icon: '🏠' },
  { value: 'solar-installer', label: 'Solar Installer', icon: '☀️' },
  { value: 'makeup-artist', label: 'Makeup Artist', icon: '💄' },
  { value: 'event-decorator', label: 'Event Decorator', icon: '🎊' },
  { value: 'photographer', label: 'Photographer', icon: '📸' },
  { value: 'caterer', label: 'Caterer', icon: '🍽️' },
  { value: 'other', label: 'Other Services', icon: '✨' },
] as const;

export type TradeValue = (typeof TRADES)[number]['value'];

export const TRADE_VALUES = TRADES.map((t) => t.value);

export const LOCATIONS = [
  'Lekki',
  'Victoria Island',
  'Ikoyi',
  'Ikeja',
  'Surulere',
  'Yaba',
  'Ajah',
  'Gbagada',
  'Maryland',
  'Ogba',
  'Mushin',
  'Oshodi',
  'Apapa',
  'Festac',
  'Amuwo-Odofin',
  'Ikorodu',
  'Epe',
  'Badagry',
  'Alimosho',
  'Agege',
  'Abuja',
  'Port Harcourt',
  'Ibadan',
  'Kano',
  'Enugu',
] as const;

export type LocationValue = (typeof LOCATIONS)[number];

export const PRICING = {
  verificationFee: 10000, // NGN one-time
  monthlySubscription: 5000, // NGN per month
  currency: 'NGN',
} as const;

export const ROLES = ['customer', 'artisan', 'merchant', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const VERIFICATION_STEPS = [
  'personal-info',
  'documents',
  'review',
] as const;
export type VerificationStep = (typeof VERIFICATION_STEPS)[number];

export const VERIFICATION_STATUSES = [
  'pending',
  'in-review',
  'approved',
  'rejected',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  'active',
  'past_due',
  'cancelled',
  'unpaid',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const WARRANTY_STATUSES = [
  'open',
  'in-progress',
  'resolved',
  'closed',
] as const;
export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number];

export const REVIEW_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest', label: 'Lowest Rated' },
] as const;

export const ARTISAN_SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'newest', label: 'Newest' },
] as const;

export const GALLERY_CATEGORIES = [
  { value: 'completed', label: 'Completed Projects', icon: '✅' },
  { value: 'before-after', label: 'Before & After', icon: '🔄' },
  { value: 'in-progress', label: 'Work in Progress', icon: '🔨' },
  { value: 'tools', label: 'Tools & Equipment', icon: '🛠️' },
  { value: 'other', label: 'Other', icon: '📷' },
] as const;

export type GalleryCategoryValue = (typeof GALLERY_CATEGORIES)[number]['value'];

export const BRAND = {
  name: 'KorrectNG',
  tagline: "Find Verified Skilled Professionals You Can Trust",
  description:
    "Nigeria's leading platform for verified skilled professionals. We connect customers with skilled, accountable service providers across all trades.",
  colors: {
    primaryGreen: '#008751',
    darkGreen: '#006B40',
    orange: '#FF6B35',
    black: '#1A1A1A',
    gray: '#666666',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
    starYellow: '#FFA000',
  },
} as const;

// ─── Contract System ────────────────────────────────────────────────────────

export const CONTRACT_STATUSES = [
  'draft',
  'pending_signatures',
  'signed',
  'active',
  'completed',
  'disputed',
  'cancelled',
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const MILESTONE_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'approved',
  'disputed',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MATERIALS_RESPONSIBILITY = ['customer', 'artisan', 'shared'] as const;
export type MaterialsResponsibility = (typeof MATERIALS_RESPONSIBILITY)[number];

export const DEFAULT_MILESTONE_SPLIT = {
  milestone1: 30, // Initial payment on signing
  milestone2: 40, // Midpoint payment
  milestone3: 30, // Final payment on completion
} as const;

// ─── Escrow System ──────────────────────────────────────────────────────────

export const ESCROW_STATUSES = [
  'created',
  'funded',
  'milestone_1_pending',
  'milestone_1_released',
  'milestone_2_pending',
  'milestone_2_released',
  'milestone_3_pending',
  'completed',
  'disputed',
  'resolved',
  'cancelled',
  'partial_refund',
] as const;
export type EscrowStatus = (typeof ESCROW_STATUSES)[number];

// ─── Dispute System ─────────────────────────────────────────────────────────

export const DISPUTE_STATUSES = [
  'opened',
  'artisan_response_pending',
  'customer_counter_pending',
  'under_review',
  'resolved',
  'escalated',
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_CATEGORIES = [
  { value: 'quality', label: 'Quality Issues' },
  { value: 'incomplete', label: 'Incomplete Work' },
  { value: 'timeline', label: 'Timeline Issues' },
  { value: 'materials', label: 'Materials Problems' },
  { value: 'communication', label: 'Communication Issues' },
  { value: 'other', label: 'Other' },
] as const;
export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number]['value'];

export const DISPUTE_DECISIONS = [
  'full_payment',
  'partial_release',
  'full_refund',
  'rework_required',
] as const;
export type DisputeDecision = (typeof DISPUTE_DECISIONS)[number];

export const DISPUTE_DEADLINES = {
  artisanResponse: 48, // hours
  customerCounter: 72, // hours
} as const;

// ─── Trust System ───────────────────────────────────────────────────────────

export const TRUST_LEVELS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type TrustLevel = (typeof TRUST_LEVELS)[number];

export const TRUST_LEVEL_THRESHOLDS = {
  bronze: 0,
  silver: 50,
  gold: 75,
  platinum: 90,
} as const;

export const TRUST_WEIGHTS = {
  completionRate: 25,
  cancellationRate: -15,
  disputeRate: -15,
  onTimeRate: 20,
  responseTime: 10,
  averageRating: 15,
} as const;

export const BADGE_TYPES = [
  'first_job',
  'jobs_10',
  'jobs_50',
  'jobs_100',
  'five_star_average',
  'quick_responder',
  'dispute_free',
  'always_on_time',
] as const;
export type BadgeType = (typeof BADGE_TYPES)[number];

// ─── Platform Fee ───────────────────────────────────────────────────────────

export const PLATFORM_FEE_PERCENTAGE = 10; // 10% platform fee

// ─── Merchant System ───────────────────────────────────────────────────────

export const MERCHANT_CATEGORIES = [
  { value: 'building-materials', label: 'Building Materials', icon: '🧱' },
  { value: 'electrical', label: 'Electrical Supplies', icon: '⚡' },
  { value: 'plumbing', label: 'Plumbing Supplies', icon: '🔧' },
  { value: 'automotive', label: 'Automotive Parts', icon: '🚗' },
  { value: 'hvac', label: 'HVAC & Cooling', icon: '❄️' },
  { value: 'tools', label: 'Tools & Equipment', icon: '🛠️' },
  { value: 'phone-parts', label: 'Phone Parts', icon: '📱' },
  { value: 'fabrics', label: 'Fabrics & Textiles', icon: '🧵' },
  { value: 'general', label: 'General Supplies', icon: '📦' },
] as const;

export type MerchantCategory = (typeof MERCHANT_CATEGORIES)[number]['value'];
export const MERCHANT_CATEGORY_VALUES = MERCHANT_CATEGORIES.map((c) => c.value);

export const MATERIAL_ORDER_STATUSES = [
  'pending',           // Created, waiting for merchant
  'confirmed',         // Merchant confirmed availability
  'payment_pending',   // Awaiting payment
  'paid',              // Paid, in escrow
  'preparing',         // Merchant preparing
  'shipped',           // Out for delivery
  'delivered',         // Delivered
  'received',          // Customer/artisan confirmed receipt
  'completed',         // Payment released
  'disputed',          // Dispute raised
  'cancelled',         // Cancelled
  'refunded',          // Refunded
] as const;

export type MaterialOrderStatus = (typeof MATERIAL_ORDER_STATUSES)[number];

export const MATERIAL_ESCROW_STATUSES = [
  'created',
  'funded',
  'release_requested',
  'released',
  'disputed',
  'refunded',
  'partial_refund',
] as const;

export type MaterialEscrowStatus = (typeof MATERIAL_ESCROW_STATUSES)[number];

export const PRODUCT_UNITS = [
  { value: 'piece', label: 'Piece(s)' },
  { value: 'bag', label: 'Bag(s)' },
  { value: 'roll', label: 'Roll(s)' },
  { value: 'meter', label: 'Meter(s)' },
  { value: 'kg', label: 'Kilogram(s)' },
  { value: 'litre', label: 'Litre(s)' },
  { value: 'pack', label: 'Pack(s)' },
  { value: 'set', label: 'Set(s)' },
  { value: 'pair', label: 'Pair(s)' },
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number]['value'];
export const PRODUCT_UNIT_VALUES = PRODUCT_UNITS.map((u) => u.value);

export const MERCHANT_PLATFORM_FEE_PERCENTAGE = 5; // 5% for material orders (lower margin business)

export const DELIVERY_TYPES = ['artisan_location', 'job_site', 'customer_address', 'pickup'] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export const MERCHANT_VERIFICATION_STEPS = [
  'business-info',
  'documents',
  'review',
] as const;
export type MerchantVerificationStep = (typeof MERCHANT_VERIFICATION_STEPS)[number];

// ─── Services by Trade ─────────────────────────────────────────────────────

export const SERVICES_BY_TRADE: Record<string, { value: string; label: string }[]> = {
  mechanic: [
    { value: 'engine-repair', label: 'Engine Repair' },
    { value: 'brake-service', label: 'Brake Service' },
    { value: 'oil-change', label: 'Oil Change' },
    { value: 'transmission', label: 'Transmission Repair' },
    { value: 'ac-repair-auto', label: 'Car AC Repair' },
    { value: 'tire-service', label: 'Tire Service' },
    { value: 'diagnostics', label: 'Vehicle Diagnostics' },
    { value: 'suspension', label: 'Suspension Repair' },
    { value: 'battery-service', label: 'Battery Service' },
    { value: 'body-work', label: 'Body Work' },
  ],
  electrician: [
    { value: 'wiring', label: 'Electrical Wiring' },
    { value: 'panel-installation', label: 'Panel Installation' },
    { value: 'lighting', label: 'Lighting Installation' },
    { value: 'socket-repair', label: 'Socket & Switch Repair' },
    { value: 'fault-finding', label: 'Fault Finding' },
    { value: 'inverter-installation', label: 'Inverter Installation' },
    { value: 'solar-installation', label: 'Solar Installation' },
    { value: 'meter-installation', label: 'Meter Installation' },
    { value: 'rewiring', label: 'House Rewiring' },
  ],
  plumber: [
    { value: 'pipe-repair', label: 'Pipe Repair' },
    { value: 'drain-cleaning', label: 'Drain Cleaning' },
    { value: 'toilet-installation', label: 'Toilet Installation' },
    { value: 'water-heater', label: 'Water Heater Service' },
    { value: 'leak-detection', label: 'Leak Detection' },
    { value: 'pump-installation', label: 'Pump Installation' },
    { value: 'bathroom-fitting', label: 'Bathroom Fitting' },
    { value: 'septic-service', label: 'Septic Tank Service' },
    { value: 'borehole', label: 'Borehole Service' },
  ],
  'ac-tech': [
    { value: 'ac-installation', label: 'AC Installation' },
    { value: 'ac-repair', label: 'AC Repair' },
    { value: 'ac-servicing', label: 'AC Servicing' },
    { value: 'gas-refill', label: 'Gas Refill' },
    { value: 'duct-cleaning', label: 'Duct Cleaning' },
    { value: 'split-ac', label: 'Split AC Service' },
    { value: 'central-ac', label: 'Central AC Service' },
    { value: 'chiller-service', label: 'Chiller Service' },
  ],
  'generator-tech': [
    { value: 'gen-repair', label: 'Generator Repair' },
    { value: 'gen-servicing', label: 'Generator Servicing' },
    { value: 'gen-installation', label: 'Generator Installation' },
    { value: 'gen-wiring', label: 'Generator Wiring' },
    { value: 'ats-installation', label: 'ATS Installation' },
    { value: 'fuel-system', label: 'Fuel System Repair' },
    { value: 'gen-overhaul', label: 'Generator Overhaul' },
  ],
  'phone-repair': [
    { value: 'screen-repair', label: 'Screen Repair' },
    { value: 'battery-replacement', label: 'Battery Replacement' },
    { value: 'software-fix', label: 'Software Fix' },
    { value: 'charging-port', label: 'Charging Port Repair' },
    { value: 'water-damage', label: 'Water Damage Repair' },
    { value: 'data-recovery', label: 'Data Recovery' },
    { value: 'speaker-mic', label: 'Speaker/Mic Repair' },
    { value: 'camera-repair', label: 'Camera Repair' },
  ],
  tailor: [
    { value: 'custom-clothing', label: 'Custom Clothing' },
    { value: 'alterations', label: 'Alterations' },
    { value: 'traditional-wear', label: 'Traditional Wear' },
    { value: 'suits', label: 'Suits & Formal Wear' },
    { value: 'wedding-attire', label: 'Wedding Attire' },
    { value: 'repairs', label: 'Clothing Repairs' },
    { value: 'uniforms', label: 'Uniforms' },
    { value: 'embroidery', label: 'Embroidery' },
  ],
  carpenter: [
    { value: 'furniture-making', label: 'Furniture Making' },
    { value: 'door-installation', label: 'Door Installation' },
    { value: 'cabinet-making', label: 'Cabinet Making' },
    { value: 'wood-repair', label: 'Wood Repair' },
    { value: 'roofing', label: 'Roofing Work' },
    { value: 'flooring', label: 'Wood Flooring' },
    { value: 'window-frames', label: 'Window Frames' },
    { value: 'kitchen-fitting', label: 'Kitchen Fitting' },
  ],
  painter: [
    { value: 'interior-painting', label: 'Interior Painting' },
    { value: 'exterior-painting', label: 'Exterior Painting' },
    { value: 'pop-design', label: 'POP Design' },
    { value: 'texture-painting', label: 'Texture Painting' },
    { value: 'wallpaper', label: 'Wallpaper Installation' },
    { value: 'spray-painting', label: 'Spray Painting' },
    { value: 'wood-finishing', label: 'Wood Finishing' },
    { value: 'epoxy-flooring', label: 'Epoxy Flooring' },
  ],
  welder: [
    { value: 'gate-fabrication', label: 'Gate Fabrication' },
    { value: 'burglar-proof', label: 'Burglar Proof' },
    { value: 'staircase', label: 'Staircase Fabrication' },
    { value: 'tank-fabrication', label: 'Tank Fabrication' },
    { value: 'repair-welding', label: 'Repair Welding' },
    { value: 'railings', label: 'Railings' },
    { value: 'roofing-steel', label: 'Steel Roofing' },
    { value: 'furniture-metal', label: 'Metal Furniture' },
  ],
  'hair-stylist': [
    { value: 'braiding', label: 'Braiding' },
    { value: 'weaving', label: 'Weaving & Extensions' },
    { value: 'locs', label: 'Locs & Dreadlocks' },
    { value: 'relaxer', label: 'Relaxer & Texturizer' },
    { value: 'coloring', label: 'Hair Coloring' },
    { value: 'treatment', label: 'Hair Treatment' },
    { value: 'styling', label: 'Styling & Updos' },
    { value: 'wig-installation', label: 'Wig Installation' },
    { value: 'kids-hair', label: "Children's Hair" },
  ],
  barber: [
    { value: 'haircut', label: 'Haircut' },
    { value: 'beard-trim', label: 'Beard Trim & Shaping' },
    { value: 'shave', label: 'Clean Shave' },
    { value: 'hair-design', label: 'Hair Designs' },
    { value: 'kids-haircut', label: "Children's Haircut" },
    { value: 'home-service', label: 'Home Service' },
    { value: 'dreadlocks', label: 'Dreadlocks' },
    { value: 'hair-coloring', label: 'Hair Coloring' },
  ],
  tiler: [
    { value: 'floor-tiling', label: 'Floor Tiling' },
    { value: 'wall-tiling', label: 'Wall Tiling' },
    { value: 'bathroom-tiling', label: 'Bathroom Tiling' },
    { value: 'kitchen-tiling', label: 'Kitchen Tiling' },
    { value: 'outdoor-tiling', label: 'Outdoor Tiling' },
    { value: 'tile-repair', label: 'Tile Repair' },
    { value: 'marble-installation', label: 'Marble Installation' },
    { value: 'granite-installation', label: 'Granite Installation' },
  ],
  'pop-installer': [
    { value: 'ceiling-pop', label: 'Ceiling POP' },
    { value: 'wall-pop', label: 'Wall POP Design' },
    { value: 'cornice', label: 'Cornice Installation' },
    { value: 'suspended-ceiling', label: 'Suspended Ceiling' },
    { value: 'pop-repair', label: 'POP Repair' },
    { value: 'decorative-pop', label: 'Decorative POP' },
    { value: 'screeding', label: 'Screeding' },
    { value: 'plastering', label: 'Plastering' },
  ],
  'solar-installer': [
    { value: 'solar-panel', label: 'Solar Panel Installation' },
    { value: 'inverter-setup', label: 'Inverter Setup' },
    { value: 'battery-installation', label: 'Battery Installation' },
    { value: 'solar-maintenance', label: 'Solar Maintenance' },
    { value: 'off-grid', label: 'Off-Grid Systems' },
    { value: 'hybrid-system', label: 'Hybrid Systems' },
    { value: 'solar-water-heater', label: 'Solar Water Heater' },
    { value: 'street-light', label: 'Solar Street Lights' },
  ],
  'makeup-artist': [
    { value: 'bridal-makeup', label: 'Bridal Makeup' },
    { value: 'party-makeup', label: 'Party Makeup' },
    { value: 'photoshoot-makeup', label: 'Photoshoot Makeup' },
    { value: 'natural-makeup', label: 'Natural/Everyday Makeup' },
    { value: 'editorial', label: 'Editorial Makeup' },
    { value: 'sfx-makeup', label: 'SFX Makeup' },
    { value: 'gele-tying', label: 'Gele Tying' },
    { value: 'makeup-training', label: 'Makeup Training' },
  ],
  'event-decorator': [
    { value: 'wedding-decor', label: 'Wedding Decoration' },
    { value: 'birthday-decor', label: 'Birthday Decoration' },
    { value: 'corporate-decor', label: 'Corporate Events' },
    { value: 'balloon-decor', label: 'Balloon Decoration' },
    { value: 'flower-arrangement', label: 'Flower Arrangement' },
    { value: 'stage-design', label: 'Stage Design' },
    { value: 'table-setting', label: 'Table Setting' },
    { value: 'outdoor-decor', label: 'Outdoor Decoration' },
  ],
  photographer: [
    { value: 'wedding-photo', label: 'Wedding Photography' },
    { value: 'portrait', label: 'Portrait Photography' },
    { value: 'event-photo', label: 'Event Photography' },
    { value: 'product-photo', label: 'Product Photography' },
    { value: 'family-photo', label: 'Family Photography' },
    { value: 'graduation', label: 'Graduation Photography' },
    { value: 'videography', label: 'Videography' },
    { value: 'drone-photo', label: 'Drone Photography' },
    { value: 'photo-editing', label: 'Photo Editing' },
  ],
  caterer: [
    { value: 'party-catering', label: 'Party Catering' },
    { value: 'wedding-catering', label: 'Wedding Catering' },
    { value: 'corporate-catering', label: 'Corporate Catering' },
    { value: 'small-chops', label: 'Small Chops' },
    { value: 'local-dishes', label: 'Nigerian Dishes' },
    { value: 'continental', label: 'Continental Cuisine' },
    { value: 'baking', label: 'Cakes & Pastries' },
    { value: 'food-tray', label: 'Food Tray Service' },
    { value: 'outdoor-catering', label: 'Outdoor Catering' },
  ],
  other: [],
};
