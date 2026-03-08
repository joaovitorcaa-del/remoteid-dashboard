import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { OverdueCard } from '@/components/OverdueCard';
import { BlockersCard } from '@/components/BlockersCard';
import { ActivityCard } from '@/components/ActivityCard';
import { DailySummaryCard } from '@/components/DailySummaryCard';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Daily() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch data from Jira
  const { data: backlogData } = trpc.jira.getBacklogIssues.useQuery();
  const { data: recentActivity = [] } = trpc.daily.getRecentActivity.useQuery({ hoursBack: 24 });
  const { data: blockers = [] } = trpc.daily.getActiveImpediments.useQuery();

  const allIssues = backlogData?.issues || [];

  // Calculate metrics
  const overdueIssues = allIssues.filter((issue: any) => {
    const dataFim = new Date(issue.dataFim);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dataFim.setHours(0, 0, 0, 0);
    return dataFim < today && issue.status?.toLowerCase() !== 'done' && issue.status?.toLowerCase() !== 'cancelled';
  });

  const issuesCompletedToday = allIssues.filter((issue: any) => {
    const updated = new Date(issue.updated || issue.atualizadoEm);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    updated.setHours(0, 0, 0, 0);
    return updated.getTime() === today.getTime() && issue.status?.toLowerCase() === 'done';
  }).length;

  const issuesInProgress = allIssues.filter((issue: any) => {
    const status = issue.status?.toLowerCase() || '';
    return status.includes('doing') || status.includes('code') || status.includes('test');
  }).length;

  const completionRate24h = allIssues && allIssues.length > 0 
    ? Math.round((issuesCompletedToday / allIssues.length) * 100)
    : 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh queries - will be handled by React Query
      setTimeout(() => setIsRefreshing(false), 1000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGenerateReport = () => {
    // TODO: Implement PDF generation
    console.log('Generating daily report...');
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Sharing daily summary...');
  };

  const handleResolveBlocker = async (id: number) => {
    try {
      // TODO: Implement resolve blocker mutation
      console.log('Resolving blocker:', id);
    } catch (error) {
      console.error('Error resolving blocker:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Daily</h1>
                <p className="text-sm text-muted-foreground">
                  Acompanhamento diário do time
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Daily Summary */}
            <DailySummaryCard
              data={{
                completionRate24h,
                issuesCompletedToday,
                issuesInProgress,
                blockedCount: blockers.length,
                overdueCount: overdueIssues.length,
              }}
              onGenerateReport={handleGenerateReport}
              onShare={handleShare}
            />

            {/* Overdue Issues */}
            <OverdueCard
              issues={overdueIssues.map((issue: any) => ({
                chave: issue.chave || issue.key,
                resumo: issue.resumo || issue.summary,
                responsavel: issue.responsavel || issue.assignee,
                dataFim: issue.dataFim,
                storyPoints: issue.storyPoints || 0,
                status: issue.status,
              }))}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Blockers */}
            <BlockersCard
              blockers={blockers.map((blocker: any) => ({
                id: blocker.id,
                issueKey: blocker.issueKey,
                issueSummary: blocker.issueSummary,
                blockedSince: blocker.blockedSince,
                reason: blocker.reason,
                impactSp: blocker.impactSp,
              }))}
              onResolve={handleResolveBlocker}
            />

            {/* Recent Activity */}
            <ActivityCard
              activities={recentActivity.map((activity: any) => ({
                id: activity.id,
                issueKey: activity.issueKey,
                fromStatus: activity.fromStatus,
                toStatus: activity.toStatus,
                changedBy: activity.changedBy,
                changedAt: activity.changedAt,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
