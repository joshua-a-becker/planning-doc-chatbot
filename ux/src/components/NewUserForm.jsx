import React, { useState } from 'react';
import { Send } from 'lucide-react';

const NewUserForm = () => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      const formattedUsername = username.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      window.location.href = `${window.location.pathname}?userId=${encodeURIComponent(formattedUsername)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="absolute inset-0" style={{ 
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(203 213 225 / 0.2) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }}></div>
      
      <div className="container mx-auto px-4 py-16 relative">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-block mb-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              AI-Powered Negotiation Platform
            </div>
            <h1 className="text-4xl font-bold text-slate-900">
              Your Personal Negotiation Coach
            </h1>
            <p className="text-xl text-slate-600">
              Master the art of negotiation with AI-powered guidance
            </p>
          </div>

          {/* Main Content Block */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
            <div className="p-8">
              <div className="prose text-slate-700">
                <p className="mb-4">
                  Think of me as your personal negotiation strategist, available 24/7 through a familiar chat interface. Rather than offering pre-made solutions, I guide you through proven frameworks to develop your own winning strategy.
                </p>
                <p className="mb-4">
                  Through our interactive dialogue, we'll analyze your position, articulate your priorities, and work together on your planning document. Instead of filling out the document for you, I'll ask targeted questions to help you determine your own strategy. I'll help you refine your issues list, identify core needs, and master the art of perspective-taking to anticipate other parties' positions.
                </p>
                <p className="mb-4">
                  Currently in beta testing and available only to students at Kellogg, this interactive tool transforms theoretical knowledge into practical preparation skills.
                </p>
                <p className="mb-4">
                  <br/><center><i>Your strategy. My guidance. Real results.</i></center>
                </p>
              </div>
            </div>
          </div>

          {/* Username Input Card */}
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-center mb-4 text-slate-900">
                Tell me your name to start.
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter user name"
                    required
                  />
                  <button 
                    type="submit" 
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUserForm;