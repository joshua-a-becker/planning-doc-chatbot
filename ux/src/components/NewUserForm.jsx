import React, { useState } from 'react';
import { Send, MessageSquare, Brain, Target, Glasses, AlertCircle } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="group bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200 hover:border-[#d3c7fc] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
    <div className="flex items-start space-x-4">
      <div className="p-3 bg-[#F6F4F9] rounded-xl group-hover:bg-[#4E2A84] transition-colors duration-300">
        <Icon className="w-6 h-6 text-[#4E2A84] group-hover:text-white transition-colors duration-300" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-[#4E2A84] group-hover:text-[#4E2A84]/90 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
          {description}
        </p>
      </div>
    </div>
  </div>
);

const NewUserForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });
  const [isHovered, setIsHovered] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    username: ''
  });

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'email') {
      setErrors(prev => ({
        ...prev,
        email: validateEmail(value)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const emailError = validateEmail(formData.email);
    setErrors(prev => ({
      ...prev,
      email: emailError
    }));

    if (!emailError && formData.username.trim()) {
      const formattedUsername = formData.username.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      window.location.href = `${window.location.pathname}?userName=${encodeURIComponent(formattedUsername)}&userId=${encodeURIComponent(formData.email)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#F6F4F9] to-slate-50 flex items-center justify-center relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,#4E2A8408,transparent)]" />

      <div className="container max-w-6xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-16 items-center relative">
        {/* Left side - Content */}
        <div className="space-y-10">
          <div className="space-y-4">
            <span className="inline-block text-sm font-medium text-[#4E2A84] bg-[#F6F4F9] px-4 py-1.5 rounded-full border border-[#d3c7fc] shadow-sm">
              Beta Access
            </span>
            <h1 className="text-4xl font-bold text-[#4E2A84] tracking-tight">
              AI Negotiation Coach
            </h1>
            <p className="text-lg text-slate-600">
              Your personal strategist for mastering the art of negotiation
            </p>
          </div>

          <div className="grid gap-5">
            <FeatureCard 
              icon={MessageSquare}
              title="Interactive Guidance"
              description="Get real-time coaching through natural conversation"
            />
            <FeatureCard 
              icon={Brain}
              title="Strategic Framework"
              description="Build your approach using proven negotiation methods"
            />
            <FeatureCard 
              icon={Target}
              title="Interest-Based Planning"
              description="Identify core interests and develop strong positions"
            />
            <FeatureCard 
              icon={Glasses}
              title="Perspective Analysis"
              description="Understand and anticipate your counterpart's moves"
            />
          </div>
        </div>

        {/* Right side - Form */}
        <div className="lg:pl-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-[#d3c7fc] shadow-lg relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50 rounded-2xl" />
            <div className="relative">
              <h2 className="text-2xl font-semibold text-[#4E2A84] mb-8">
                Start Your Session
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-white rounded-lg border ${
                        errors.email ? 'border-red-500' : 'border-slate-200'
                      } focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200 shadow-sm`}
                      placeholder="Enter your email"
                      required
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div 
                    className="relative group"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#836EAA] focus:border-transparent transition-all duration-200 pr-12 shadow-sm"
                      placeholder="Enter your username"
                      required
                    />
                    <button 
                      type="submit"
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md transition-all duration-300 ${
                        isHovered ? 'bg-[#4E2A84] text-white' : 'text-[#4E2A84]'
                      }`}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-500 text-center">
                  Your AI coach is ready to help you prepare
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUserForm;