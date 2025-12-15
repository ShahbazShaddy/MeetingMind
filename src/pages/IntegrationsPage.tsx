import { Link } from 'react-router-dom';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';

export function IntegrationsPage() {
  const integrations = [
    { name: 'Google Meet', description: 'Connect your Google Meet meetings' },
    { name: 'Zoom', description: 'Seamless Zoom integration' },
    { name: 'Microsoft Teams', description: 'Works with Microsoft Teams' },
    { name: 'Slack', description: 'Share summaries and action items to Slack' },
    { name: 'Google Calendar', description: 'Automatic meeting detection' },
    { name: 'Outlook', description: 'Calendar and meeting integration' },
    { name: 'Jira', description: 'Create Jira issues from action items' },
    { name: 'Asana', description: 'Push tasks to Asana' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Integrations that{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Work Together
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect MeetingMind with your favorite tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {integrations.map((integration, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200 hover:border-primary-200 hover:shadow-soft transition-all"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">{integration.name}</h3>
                <p className="text-gray-600 text-sm">{integration.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-12 text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">More Integrations Coming Soon</h2>
            <p className="text-gray-600 mb-6">We're constantly adding new integrations to expand your workflow</p>
            <Link to="/signup">
              <Button className="gradient-primary text-white px-8 py-6 text-lg rounded-xl hover:shadow-medium transition-all">
                Get Started Free
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
