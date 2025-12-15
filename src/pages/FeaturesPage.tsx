import { Link } from 'react-router-dom';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';

export function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Powerful Features for{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Modern Teams
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to transform meetings into actionable insights
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-12 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Transcription</h2>
                <p className="text-gray-600 mb-4">
                  Automatic, accurate meeting transcripts with speaker identification and timestamps. Never miss a word with our advanced AI technology.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Smart Summaries</h2>
                <p className="text-gray-600 mb-4">
                  Get instant meeting summaries highlighting key points, decisions, and next steps. Save hours every week on meeting follow-ups.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Action Item Tracking</h2>
                <p className="text-gray-600 mb-4">
                  Never miss a task. Automatically extract and assign action items with due dates. Nothing falls through the cracks.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Decision Logging</h2>
                <p className="text-gray-600 mb-4">
                  Capture and organize all decisions made during meetings with full context. Always know who decided what and why.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Smart Search</h2>
                <p className="text-gray-600 mb-4">
                  Find anything across all meetings using natural language queries. Intelligent search that understands context.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics & Insights</h2>
                <p className="text-gray-600 mb-4">
                  Track meeting trends, productivity metrics, and team engagement. Data-driven insights to improve your meetings.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
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
