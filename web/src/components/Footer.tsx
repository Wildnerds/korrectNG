import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-brand-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10">
          <div className="sm:col-span-2 md:col-span-1">
            <h3 className="text-brand-green text-xl font-bold mb-4">
              Korrect<span className="text-brand-orange">NG</span>
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Nigeria&apos;s leading platform for verified artisans. We connect customers with
              skilled, accountable service providers across all trades.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Customers</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="text-gray-400 hover:text-white transition-colors">Find Artisans</Link></li>
              <li><Link href="/#how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/dashboard/customer" className="text-gray-400 hover:text-white transition-colors">Warranty Claims</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Artisans</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/auth/register?role=artisan" className="text-gray-400 hover:text-white transition-colors">Get Verified</Link></li>
              <li><Link href="/dashboard/artisan" className="text-gray-400 hover:text-white transition-colors">Artisan Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} KorrectNG. All rights reserved.</p>
          <p className="mt-2">KorrectNG is a product of Hives & Hornets Ltd.</p>
        </div>
      </div>
    </footer>
  );
}
