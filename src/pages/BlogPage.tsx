import { Link } from 'react-router-dom';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';

export function BlogPage() {
  const posts = [
    {
      title: 'How to Run More Productive Meetings',
      excerpt: 'Tips and tricks for making your meetings count and reducing meeting fatigue.',
      date: 'December 10, 2025',
      category: 'Best Practices',
    },
    {
      title: 'AI in the Workplace: What Remote Teams Need to Know',
      excerpt: 'Exploring how AI is transforming remote work and team collaboration.',
      date: 'December 5, 2025',
      category: 'AI & Technology',
    },
    {
      title: 'The Hidden Cost of Meeting Inefficiency',
      excerpt: 'Research shows inefficient meetings cost teams thousands in lost productivity.',
      date: 'November 28, 2025',
      category: 'Industry Insights',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              MeetingMind{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Blog
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Insights, tips, and stories about meetings and remote work
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {posts.map((post, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-primary-200 hover:shadow-soft transition-all"
              >
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                    {post.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">{post.date}</span>
                  <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                    Read More →
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-6">More articles coming soon. Subscribe for updates.</p>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
