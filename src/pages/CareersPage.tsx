import { Link } from 'react-router-dom';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';

export function CareersPage() {
  const positions = [
    {
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      location: 'Remote',
    },
    {
      title: 'AI/ML Engineer',
      department: 'AI & Research',
      location: 'Remote',
    },
    {
      title: 'Product Manager',
      department: 'Product',
      location: 'Remote',
    },
    {
      title: 'Customer Success Manager',
      department: 'Sales & CS',
      location: 'Remote',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Join Our{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Team
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Help us transform the way teams work
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {positions.map((position, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-2xl p-8 border-2 border-gray-200 hover:border-primary-200 hover:shadow-soft transition-all"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{position.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{position.department} • {position.location}</p>
                <a href="#" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center space-x-2">
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Don't see your role?</h2>
            <p className="text-gray-600 mb-6">Send us your resume and let us know what you're interested in</p>
            <Button className="gradient-primary text-white px-8 py-6 text-lg rounded-xl hover:shadow-medium transition-all">
              Send Your Resume
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
