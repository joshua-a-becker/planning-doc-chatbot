import React from 'react';
import { ArrowRight, Mail, Twitter } from 'lucide-react';

const NewUserForm = () => {
  return (
    <div className="min-h-screen bg-[#171A1C] text-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h4 className="text-[#00FFC2] text-sm font-semibold uppercase mb-4">
              Meet Morgan, your all-in-one guide.
            </h4>
            <h1 className="text-5xl font-semibold mb-6">
              Negotiate like a pro today!
            </h1>
            <p className="text-lg mb-8">
              Sit back and let Morgan get you ready for negotiations and other difficult conversations. Optimize your results while skipping the lectures, online classes, and homework!
            </p>
            <button className="bg-transparent border-2 border-[#00FFC2] text-white px-8 py-3 rounded-full flex items-center gap-2 hover:scale-105 transition-transform">
              Get started
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div>
            <div className="rounded-2xl border-2 border-[#00FFC2] p-3 h-[35rem]">
              <img 
                src="/api/placeholder/800/600"
                alt="Morgan Coach Demo"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h4 className="text-[#00FFC2] text-sm font-semibold uppercase mb-4">
            How It Works
          </h4>
          <h2 className="text-5xl font-semibold mb-6">
            Smart Coaching Features
          </h2>
          <p className="text-lg">
            Experience personalized guidance tailored to your needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {/* Feature 1 */}
          <div>
            <div className="rounded-2xl border border-[#00FFC2] p-3 h-64 mb-6">
              <img 
                src="/api/placeholder/400/300"
                alt="Interactive Guidance"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <h3 className="text-2xl font-semibold mb-4">Interactive Guidance</h3>
            <p className="text-gray-300">
              Through a natural conversational interface, our coach harnesses cutting edge research and practice to improve your outcomes.
            </p>
          </div>

          {/* Feature 2 */}
          <div>
            <div className="rounded-2xl border border-[#00FFC2] p-3 h-64 mb-6">
              <img 
                src="/api/placeholder/400/300"
                alt="Expert Advice"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <h3 className="text-2xl font-semibold mb-4">Expert Advice</h3>
            <p className="text-gray-300">
              We draw on deep professional experience of the design team as well as a carefully curated set of research and principles.
            </p>
          </div>

          {/* Feature 3 */}
          <div>
            <div className="rounded-2xl border border-[#00FFC2] p-3 h-64 mb-6">
              <img 
                src="/api/placeholder/400/300"
                alt="Perspective Analysis"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <h3 className="text-2xl font-semibold mb-4">Perspective Analysis</h3>
            <p className="text-gray-300">
              Our coach will guide you to think carefully through both your own situation and the perspectives of other parties.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h4 className="text-[#00FFC2] text-sm font-semibold uppercase mb-4">
            Try it today
          </h4>
          <h2 className="text-5xl font-semibold mb-6">
            Simple Pricing
          </h2>
          <p className="text-lg">
            Choose the plan that works best for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Annual Plan */}
          <div className="border border-[rgba(255,255,255,0.09)] rounded-2xl p-8 bg-[#171A1C]">
            <h4 className="text-[#00FFC2] text-sm font-semibold uppercase mb-2">
              annually
            </h4>
            <h3 className="text-5xl font-semibold mb-4">$9</h3>
            <p className="text-gray-300 mb-8">
              A great deal if you negotiate regularly or just want to optimize your daily life.
            </p>
            <button className="w-full bg-transparent border-2 border-[#00FFC2] text-white px-8 py-3 rounded-full flex items-center justify-center gap-2 hover:scale-105 transition-transform">
              Select
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Monthly Plan */}
          <div className="border border-[rgba(255,255,255,0.09)] rounded-2xl p-8 bg-[#171A1C]">
            <h4 className="text-[#00FFC2] text-sm font-semibold uppercase mb-2">
              Monthly
            </h4>
            <h3 className="text-5xl font-semibold mb-4">$20</h3>
            <p className="text-gray-300 mb-8">
              The best option for short term use by occasional negotiators or for big one-time decisions.
            </p>
            <button className="w-full bg-transparent border-2 border-[#00FFC2] text-white px-8 py-3 rounded-full flex items-center justify-center gap-2 hover:scale-105 transition-transform">
              Select
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Enterprise Option */}
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <h3 className="text-2xl font-semibold mb-4">Enterprise Services</h3>
          <p className="text-gray-300 mb-8">
            We provide enterprise level services for those with additional security needs, custom features, and wholesale pricing.
          </p>
          <button className="bg-transparent border-2 border-[#00FFC2] text-white px-8 py-3 rounded-full flex items-center gap-2 hover:scale-105 transition-transform mx-auto">
            Book an info session
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.09)] mt-24">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-4">
              <a href="https://bsky.app/profile/joshuabecker.bsky.social" 
                className="w-12 h-12 border-2 border-[#00FFC2] rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="mailto:contact@example.com" 
                className="w-12 h-12 border-2 border-[#00FFC2] rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                <Mail className="w-6 h-6" />
              </a>
            </div>
            <p className="text-gray-300">© Joshua Becker 2024. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NewUserForm;