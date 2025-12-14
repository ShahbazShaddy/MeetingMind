import { Header } from '../components/layout/Header';
import { RecentMeetings } from '../components/dashboard/RecentMeetings';
import { ActionItems } from '../components/dashboard/ActionItems';
import { KeyDecisions } from '../components/dashboard/KeyDecisions';
import { TrendingTopics } from '../components/dashboard/TrendingTopics';
import { MeetingStats } from '../components/dashboard/MeetingStats';
import { NewMeetingModal } from '../components/meeting/NewMeetingModal';
import { useAuthStore } from '../stores/authStore';
import { ListTodo, Lightbulb, TrendingUp } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuthStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-muted-foreground">
              Here's what happened in your meetings
            </p>
          </div>
          <NewMeetingModal />
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - 25% */}
          <div className="lg:col-span-3 space-y-6 animate-slide-up">
            <div className="bg-card rounded-xl shadow-soft border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Recent Meetings</h2>
              <RecentMeetings />
            </div>
          </div>

          {/* Center Content - 50% */}
          <div className="lg:col-span-6 space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {/* Action Items */}
            <div className="bg-card rounded-xl shadow-soft border border-border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <ListTodo className="w-4 h-4 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Action Items</h2>
              </div>
              <ActionItems />
            </div>

            {/* Key Decisions */}
            <div className="bg-card rounded-xl shadow-soft border border-border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Key Decisions This Week</h2>
              </div>
              <KeyDecisions />
            </div>

            {/* Trending Topics */}
            <div className="bg-card rounded-xl shadow-soft border border-border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-accent-600" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Trending Topics</h2>
              </div>
              <TrendingTopics />
            </div>
          </div>

          {/* Right Sidebar - 25% */}
          <div className="lg:col-span-3 space-y-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="bg-card rounded-xl shadow-soft border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Meeting Stats</h2>
              <MeetingStats />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
