import { Link } from 'react-router-dom';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              About{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                MeetingMind
              </span>
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                At MeetingMind, we believe that meetings should be productive, not draining. We're on a mission to transform 
                how remote teams collaborate by turning meeting chaos into actionable intelligence.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                We envision a world where every meeting creates value, decisions are documented, and teams stay perfectly aligned 
                without drowning in follow-up work.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-12 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why Choose MeetingMind?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered</h3>
                <p className="text-gray-600">Advanced artificial intelligence that understands context and captures what matters.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">User-Focused</h3>
                <p className="text-gray-600">Built by teams, for teams. Every feature is designed with user feedback in mind.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Private</h3>
                <p className="text-gray-600">Enterprise-grade security and privacy. Your data is always protected.</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link to="/signup">
              <Button className="gradient-primary text-white px-8 py-6 text-lg rounded-xl hover:shadow-medium transition-all">
                Join Our Mission
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
