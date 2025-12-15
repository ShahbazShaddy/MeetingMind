import { Link } from 'react-router-dom';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Button } from '../components/ui/button';
import { ArrowRight, Code } from 'lucide-react';

export function APIPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Powerful{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                API
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Build custom integrations with MeetingMind
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div>
              <Code className="w-12 h-12 text-primary-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">RESTful API</h2>
              <p className="text-gray-600 mb-4">
                Complete REST API documentation with SDKs for Python, JavaScript, and more. Easy to integrate and extend.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>✓ Meetings endpoints</li>
                <li>✓ Transcripts API</li>
                <li>✓ Action items API</li>
                <li>✓ Real-time webhooks</li>
              </ul>
            </div>
            <div className="bg-gray-900 text-white rounded-2xl p-8">
              <pre className="text-sm overflow-x-auto">
                <code>{`// Get meeting summary
GET /api/meetings/:id

{
  "id": "meeting_123",
  "title": "Team Sync",
  "summary": "...",
  "actionItems": [...],
  "decisions": [...]
}`}</code>
              </pre>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Build?</h2>
            <p className="text-gray-600 mb-6">Access our comprehensive API documentation and SDKs</p>
            <Button className="gradient-primary text-white px-8 py-6 text-lg rounded-xl hover:shadow-medium transition-all">
              View Documentation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
