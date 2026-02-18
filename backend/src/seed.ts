import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { User } from './models/User';
import { ArtisanProfile } from './models/ArtisanProfile';
import { Review } from './models/Review';
import { log } from './utils/logger';

const artisansData = [
  {
    firstName: 'Emeka', lastName: 'Okafor', email: 'emeka@test.com', phone: '08012345001',
    business: 'Emeka Motors', trade: 'mechanic' as const, location: 'Lekki',
    description: 'Expert auto mechanic specializing in Japanese and German cars. Over 3 years of experience with diagnostics, engine repair, and maintenance services.',
    years: 3, jobs: 120, rating: 4.9, reviews: 47,
  },
  {
    firstName: 'Bayo', lastName: 'Adeyemi', email: 'bayo@test.com', phone: '08012345002',
    business: 'Bayo Electrics', trade: 'electrician' as const, location: 'Victoria Island',
    description: 'Certified electrician handling residential and commercial electrical work. Wiring, panel upgrades, and smart home installations.',
    years: 5, jobs: 200, rating: 4.8, reviews: 62,
  },
  {
    firstName: 'Chidi', lastName: 'Nnamdi', email: 'chidi@test.com', phone: '08012345003',
    business: 'CoolBreeze AC', trade: 'ac-tech' as const, location: 'Ikoyi',
    description: 'AC installation, repair, and maintenance specialist. All brands including Samsung, LG, Daikin. Same-day service available.',
    years: 4, jobs: 85, rating: 5.0, reviews: 34,
  },
  {
    firstName: 'Femi', lastName: 'Bakare', email: 'femi@test.com', phone: '08012345004',
    business: 'Femi Plumbing Works', trade: 'plumber' as const, location: 'Ikeja',
    description: 'Professional plumber with expertise in pipe installation, leak repairs, bathroom renovations, and water heater installations.',
    years: 6, jobs: 150, rating: 4.7, reviews: 53,
  },
  {
    firstName: 'Kemi', lastName: 'Adeola', email: 'kemi@test.com', phone: '08012345005',
    business: 'Kemi Fashion House', trade: 'tailor' as const, location: 'Surulere',
    description: 'Bespoke tailoring for men and women. Traditional and modern styles. Wedding outfits, corporate wear, and casual clothing.',
    years: 8, jobs: 300, rating: 4.9, reviews: 89,
  },
  {
    firstName: 'Abdul', lastName: 'Ibrahim', email: 'abdul@test.com', phone: '08012345006',
    business: 'Abdul Generator Solutions', trade: 'generator-tech' as const, location: 'Yaba',
    description: 'Generator repair and servicing for all brands. Inverter installations, fuel system repairs, and preventive maintenance.',
    years: 7, jobs: 180, rating: 4.6, reviews: 41,
  },
  {
    firstName: 'Tunde', lastName: 'Ogunleye', email: 'tunde@test.com', phone: '08012345007',
    business: 'PhoneFix Nigeria', trade: 'phone-repair' as const, location: 'Ajah',
    description: 'Screen replacement, battery swap, water damage repair for all phone brands. iPhone, Samsung, and Tecno specialist.',
    years: 4, jobs: 500, rating: 4.8, reviews: 120,
  },
  {
    firstName: 'Ngozi', lastName: 'Eze', email: 'ngozi@test.com', phone: '08012345008',
    business: 'Ngozi Interior Painting', trade: 'painter' as const, location: 'Gbagada',
    description: 'Interior and exterior painting specialist. Color consultation, texture painting, and wallpaper installation for homes and offices.',
    years: 5, jobs: 90, rating: 4.5, reviews: 28,
  },
  {
    firstName: 'Segun', lastName: 'Afolabi', email: 'segun@test.com', phone: '08012345009',
    business: 'Segun Woodworks', trade: 'carpenter' as const, location: 'Maryland',
    description: 'Custom furniture, kitchen cabinets, wardrobes, and wooden structures. Quality hardwood and modern designs.',
    years: 10, jobs: 250, rating: 4.7, reviews: 66,
  },
  {
    firstName: 'Yusuf', lastName: 'Mustapha', email: 'yusuf@test.com', phone: '08012345010',
    business: 'Yusuf Welding & Fabrication', trade: 'welder' as const, location: 'Festac',
    description: 'Metal fabrication, gate making, burglary proof, railings, and structural welding. MIG and ARC welding certified.',
    years: 6, jobs: 130, rating: 4.6, reviews: 37,
  },
  {
    firstName: 'Amaka', lastName: 'Ugochi', email: 'amaka@test.com', phone: '08012345011',
    business: 'Amaka Supreme Auto', trade: 'mechanic' as const, location: 'Ogba',
    description: 'Female mechanic breaking barriers. Specializing in Toyota, Honda, and Hyundai. Honest diagnostics and fair pricing guaranteed.',
    years: 4, jobs: 95, rating: 4.9, reviews: 55,
  },
  {
    firstName: 'Ola', lastName: 'Williams', email: 'ola@test.com', phone: '08012345012',
    business: 'BrightSpark Electricals', trade: 'electrician' as const, location: 'Lekki',
    description: 'Solar panel installation, inverter setup, and general electrical maintenance. Energy-saving solutions for homes and businesses.',
    years: 3, jobs: 70, rating: 4.4, reviews: 22,
  },
  {
    firstName: 'Musa', lastName: 'Danjuma', email: 'musa@test.com', phone: '08012345013',
    business: 'Abuja Plumbing Pro', trade: 'plumber' as const, location: 'Abuja',
    description: 'Top plumber in Abuja. Water treatment systems, borehole maintenance, pipe fitting, and bathroom installations.',
    years: 9, jobs: 320, rating: 4.8, reviews: 78,
  },
  {
    firstName: 'Grace', lastName: 'Obi', email: 'grace@test.com', phone: '08012345014',
    business: 'Grace Cool Systems', trade: 'ac-tech' as const, location: 'Ikeja',
    description: 'AC and refrigeration specialist. Installation, gas charging, compressor repair, and ducted system maintenance.',
    years: 5, jobs: 110, rating: 4.7, reviews: 44,
  },
  {
    firstName: 'Kunle', lastName: 'Adebayo', email: 'kunle@test.com', phone: '08012345015',
    business: 'KA Tailoring', trade: 'tailor' as const, location: 'Ibadan',
    description: 'Master tailor for traditional agbada, senator wear, and modern suits. Quick delivery and perfect fitting guaranteed.',
    years: 12, jobs: 450, rating: 4.9, reviews: 102,
  },
];

const reviewTexts = [
  { title: 'Excellent work!', text: 'Very professional and completed the job on time. Would definitely recommend to anyone.' },
  { title: 'Great service', text: 'Good communication throughout the project. The result exceeded my expectations.' },
  { title: 'Very reliable', text: 'Showed up on time and did exactly what was promised. Fair pricing too.' },
  { title: 'Top quality', text: 'The workmanship is outstanding. Can tell this person really knows their craft.' },
  { title: 'Will use again', text: 'Fast, efficient, and reasonably priced. Already recommended to my neighbors.' },
  { title: 'Impressed', text: 'First time using this service and I am thoroughly impressed with the quality of work.' },
  { title: 'Professional', text: 'Very professional approach. Explained everything before starting and cleaned up after.' },
  { title: 'Good value', text: 'Excellent value for money. The quality of work far exceeded what I expected at this price.' },
];

async function seed() {
  await connectDB();

  log.info('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    ArtisanProfile.deleteMany({}),
    Review.deleteMany({}),
  ]);

  const plainPassword = 'Test1234';

  // Create admin user
  const admin = await User.create({
    firstName: 'Admin',
    lastName: 'KorrectNG',
    email: 'admin@korrectng.com',
    phone: '08000000000',
    password: plainPassword,
    role: 'admin',
    isEmailVerified: true,
  });
  log.info('Created admin user', { email: admin.email });

  // Create customer users
  const customers = await User.create([
    { firstName: 'John', lastName: 'Customer', email: 'john@test.com', phone: '08099990001', password: plainPassword, role: 'customer', isEmailVerified: true },
    { firstName: 'Mary', lastName: 'Shopper', email: 'mary@test.com', phone: '08099990002', password: plainPassword, role: 'customer', isEmailVerified: true },
    { firstName: 'David', lastName: 'Client', email: 'david@test.com', phone: '08099990003', password: plainPassword, role: 'customer', isEmailVerified: true },
    { firstName: 'Sarah', lastName: 'Buyer', email: 'sarah@test.com', phone: '08099990004', password: plainPassword, role: 'customer', isEmailVerified: true },
    { firstName: 'Tola', lastName: 'Resident', email: 'tola@test.com', phone: '08099990005', password: plainPassword, role: 'customer', isEmailVerified: true },
  ]);
  log.info('Created customer users', { count: customers.length });

  // Nigerian/African face images from Unsplash
  const nigerianFaces = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face', // African man
    'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=300&h=300&fit=crop&crop=face', // African man smiling
    'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=300&h=300&fit=crop&crop=face', // African man
    'https://images.unsplash.com/photo-1539701938214-0d9736e1c16b?w=300&h=300&fit=crop&crop=face', // African man professional
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face', // African woman
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&h=300&fit=crop&crop=face', // African woman smiling
    'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=300&h=300&fit=crop&crop=face', // African man casual
    'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=300&h=300&fit=crop&crop=face', // African woman
    'https://images.unsplash.com/photo-1536766768598-e09213fdcf22?w=300&h=300&fit=crop&crop=face', // African man
    'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=300&h=300&fit=crop&crop=face', // African man confident
    'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=300&h=300&fit=crop&crop=face', // African woman professional
    'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=300&h=300&fit=crop&crop=face', // African man
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop&crop=face', // African man business
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face', // African woman
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop&crop=face', // African woman
  ];

  // Create artisan users and profiles
  let artisanIndex = 0;
  for (const data of artisansData) {
    // Use Nigerian faces from Unsplash
    const avatarUrl = nigerianFaces[artisanIndex % nigerianFaces.length];

    const user = await User.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      password: plainPassword,
      role: 'artisan',
      isEmailVerified: true,
      avatar: avatarUrl,
    });

    artisanIndex++;

    const slug =
      data.business.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-') +
      '-' +
      data.location.toLowerCase();

    const artisan = await ArtisanProfile.create({
      user: user._id,
      businessName: data.business,
      slug,
      trade: data.trade,
      description: data.description,
      location: data.location,
      address: `123 Main Street, ${data.location}, Lagos`,
      whatsappNumber: data.phone,
      phoneNumber: data.phone,
      yearsOfExperience: data.years,
      jobsCompleted: data.jobs,
      verificationStatus: 'approved',
      isPublished: true,
      subscriptionActive: true,
      averageRating: data.rating,
      totalReviews: data.reviews,
      galleryImages: [],
    });

    // Create some reviews
    const numReviews = Math.min(data.reviews, 5);
    for (let i = 0; i < numReviews; i++) {
      const customer = customers[i % customers.length];
      const review = reviewTexts[i % reviewTexts.length];
      const rating = Math.max(3, Math.min(5, Math.round(data.rating + (Math.random() - 0.5))));

      try {
        await Review.create({
          artisan: artisan._id,
          customer: customer._id,
          rating,
          title: review.title,
          text: review.text,
          jobType: data.trade,
        });
      } catch {
        // Skip duplicate reviews
      }
    }

    log.info('Created artisan', { business: data.business, trade: data.trade, location: data.location });
  }

  log.info('Seed completed!');
  log.info('Test credentials:', {
    admin: 'admin@korrectng.com / Test1234',
    customer: 'john@test.com / Test1234',
    artisan: 'emeka@test.com / Test1234',
  });

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  log.error('Seed error', { error: err instanceof Error ? err.message : err });
  process.exit(1);
});
