import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us | KorrectNG',
  description: 'Learn about KorrectNG - Nigeria\'s Trusted Artisan Marketplace',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-brand-green text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            About Korrect<span className="text-brand-orange">NG</span>
          </h1>
          <p className="text-xl text-green-100">
            Building Trust in Nigeria's Service Economy
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12 space-y-12">
          {/* Mission */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed">
              KorrectNG was founded with a simple but powerful mission: to bring trust and accountability
              to Nigeria's artisan economy. We believe that every Nigerian deserves access to reliable,
              skilled professionals for their service needs - from car repairs to home improvements.
            </p>
          </section>

          {/* The Problem */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">The Problem We're Solving</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Finding a trustworthy artisan in Nigeria has always been a gamble. Horror stories abound:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
              <li>Mechanics who overcharge or damage vehicles further</li>
              <li>Electricians who disappear mid-job</li>
              <li>Plumbers whose "repairs" create new problems</li>
              <li>Artisans with no accountability when work goes wrong</li>
            </ul>
            <p className="text-gray-600 leading-relaxed">
              The traditional word-of-mouth system has failed. Customers have no way to verify credentials,
              check reviews, or hold artisans accountable. Until now.
            </p>
          </section>

          {/* Our Solution */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Solution</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-brand-green mb-2">Verified Artisans</h3>
                <p className="text-gray-600 text-sm">
                  Every artisan undergoes ID verification and credential checks before joining our platform.
                </p>
              </div>
              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="font-semibold text-brand-orange mb-2">Real Reviews</h3>
                <p className="text-gray-600 text-sm">
                  Genuine customer reviews help you make informed decisions and hold artisans accountable.
                </p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-brand-green mb-2">30-Day Warranty</h3>
                <p className="text-gray-600 text-sm">
                  All jobs come with warranty protection. If something goes wrong, we help make it right.
                </p>
              </div>
              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="font-semibold text-brand-orange mb-2">Easy Discovery</h3>
                <p className="text-gray-600 text-sm">
                  Find the right artisan for your needs with powerful search and filtering tools.
                </p>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="bg-gray-50 -mx-8 md:-mx-12 px-8 md:px-12 py-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">KorrectNG by Numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-brand-green">10+</div>
                <div className="text-sm text-gray-500">Trade Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-brand-green">25+</div>
                <div className="text-sm text-gray-500">Cities Covered</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-brand-green">30</div>
                <div className="text-sm text-gray-500">Day Warranty</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-brand-green">100%</div>
                <div className="text-sm text-gray-500">Verified Artisans</div>
              </div>
            </div>
          </section>

          {/* Values */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Trust First</h3>
                <p className="text-gray-600 text-sm">
                  We never compromise on verification. Every artisan on our platform has been vetted.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Customer Protection</h3>
                <p className="text-gray-600 text-sm">
                  Our warranty and review systems ensure customers are never left stranded.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Artisan Empowerment</h3>
                <p className="text-gray-600 text-sm">
                  We help skilled professionals build their reputation and grow their business.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Transparency</h3>
                <p className="text-gray-600 text-sm">
                  Open reviews, clear pricing, and honest communication in everything we do.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/search"
                className="bg-brand-green text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Find an Artisan
              </Link>
              <Link
                href="/auth/register?role=artisan"
                className="bg-brand-orange text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Join as Artisan
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
