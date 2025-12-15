import { Link } from 'react-router-dom';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Button } from '../components/ui/button';
import {
  Brain,
  Sparkles,
  MessageSquare,
  ListTodo,
  Lightbulb,
  TrendingUp,
  Clock,
  Users,
  Search,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export function LandingPage() {
  const features = [
    {
      icon: MessageSquare,
      title: 'AI-Powered Transcription',
      description: 'Automatic, accurate meeting transcripts with speaker identification and timestamps.',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      icon: Sparkles,
      title: 'Smart Summaries',
      description: 'Get instant meeting summaries highlighting key points, decisions, and next steps.',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      icon: ListTodo,
      title: 'Action Item Tracking',
      description: 'Never miss a task. Automatically extract and assign action items with due dates.',
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      icon: Lightbulb,
      title: 'Decision Logging',
      description: 'Capture and organize all decisions made during meetings with full context.',
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      icon: Search,
      title: 'Smart Search',
      description: 'Find anything across all meetings using natural language queries.',
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
    {
      icon: TrendingUp,
      title: 'Analytics & Insights',
      description: 'Track meeting trends, productivity metrics, and team engagement.',
      color: 'text-pink-600',
      bg: 'bg-pink-100',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Connect Your Calendar',
      description: 'Integrate with Google Calendar, Outlook, or your preferred scheduling tool.',
    },
    {
      number: '02',
      title: 'Join Your Meeting',
      description: 'MeetingMind automatically joins and records your virtual meetings.',
    },
    {
      number: '03',
      title: 'Get Instant Insights',
      description: 'Receive AI-generated summaries, action items, and searchable transcripts.',
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Active Teams' },
    { value: '500K+', label: 'Meetings Analyzed' },
    { value: '35%', label: 'Time Saved' },
    { value: '4.9/5', label: 'User Rating' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <div className="inline-flex items-center space-x-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Powered by Advanced AI</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Transform Meetings Into{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Actionable Insights
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed">
              AI-powered meeting intelligence for remote teams. Never miss a detail,
              stay organized, and boost productivity with automated transcription,
              smart summaries, and action item tracking.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
              <Link to="/signup">
                <Button className="gradient-primary text-white px-8 py-6 text-lg rounded-xl hover:shadow-medium transition-all">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Free 14-day trial</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Dashboard Preview */}
          <div className="mt-16 animate-slide-up">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1400&h=800&fit=crop"
                alt="MeetingMind Dashboard Preview"
                className="w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm md:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Master Your Meetings
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to help remote teams stay aligned, productive, and focused on what matters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-primary-200 hover:shadow-soft transition-all animate-slide-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-xl ${feature.bg} flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-primary-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple setup, powerful results. Start transforming your meetings today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, idx) => (
              <div key={idx} className="relative animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="bg-white rounded-2xl p-8 shadow-soft border border-gray-100 h-full">
                  <div className="text-6xl font-bold text-primary-100 mb-4">{step.number}</div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                    <ArrowRight className="w-12 h-12 text-primary-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Meetings?
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            Join thousands of teams already saving time and staying organized with MeetingMind.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/signup">
              <Button className="bg-white text-primary-600 px-8 py-6 text-lg rounded-xl hover:bg-gray-50 transition-all shadow-soft">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
