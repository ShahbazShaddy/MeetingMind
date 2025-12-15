import { Link } from 'react-router-dom';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Button } from '../components/ui/button';
import { ArrowRight, Check } from 'lucide-react';

export function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for getting started',
      features: ['5 meetings/month', 'Basic transcription', 'Email support'],
    },
    {
      name: 'Professional',
      price: '$29',
      period: '/month',
      description: 'For growing teams',
      features: ['Unlimited meetings', 'Advanced AI summaries', 'Action item tracking', 'Priority support'],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large organizations',
      features: ['Custom features', 'Dedicated support', 'Advanced analytics', 'SSO & compliance'],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Simple,{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Transparent Pricing
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that works best for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-8 border-2 transition-all ${
                  plan.highlighted
                    ? 'border-primary-600 bg-gradient-to-br from-primary-50 to-accent-50 shadow-soft'
                    : 'border-gray-200 hover:border-primary-200'
                }`}
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-600 ml-2">{plan.period}</span>}
                </div>
                <Link to="/signup" className="block mb-6">
                  <Button
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      plan.highlighted
                        ? 'gradient-primary text-white'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    Get Started
                  </Button>
                </Link>
                <div className="space-y-3">
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-6">All plans include a 14-day free trial. No credit card required.</p>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
