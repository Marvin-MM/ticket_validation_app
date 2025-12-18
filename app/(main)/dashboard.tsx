import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import { getOfflineStats } from '@/lib/database';
import type { StatsResponse } from '@/types/api';

export default function DashboardScreen() {
  const manager = useAuthStore((state) => state.manager);
  const { isOfflineMode, isOnline } = useAppStore();

  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await api.get<StatsResponse>('/api/v1/validation/my-stats');
      return response.data;
    },
    enabled: !isOfflineMode && isOnline,
    refetchInterval: 30000,
  });

  const offlineStatsQuery = useQuery({
    queryKey: ['offline-stats'],
    queryFn: getOfflineStats,
    enabled: isOfflineMode || !isOnline,
    refetchInterval: 5000,
  });

  const isUsingOfflineStats = isOfflineMode || !isOnline;
  const onlineStats = statsQuery.data?.data;
  const offlineStats = offlineStatsQuery.data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{manager?.name || 'Manager'}</Text>
          </View>
          <View style={styles.roleContainer}>
            <Text style={styles.roleText}>{manager?.role || 'MANAGER'}</Text>
          </View>
        </View>

        {(!isOnline || isOfflineMode) && (
          <View style={styles.offlineNotice}>
            <AlertCircle size={20} color="#f59e0b" />
            <Text style={styles.offlineText}>
              {isOfflineMode ? 'Running in offline mode' : 'No internet connection'}
            </Text>
          </View>
        )}

        <View style={styles.statsContainer}>
          {statsQuery.isLoading && !isOfflineMode && isOnline ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading stats...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Calendar size={24} color="#2563eb" />
                </View>
                <Text style={styles.statValue}>
                  {isUsingOfflineStats
                    ? (offlineStats?.totalScans || 0)
                    : (onlineStats?.today || 0)
                  }
                </Text>
                <Text style={styles.statLabel}>
                  {isUsingOfflineStats ? 'Total Scans' : 'Today'}
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <TrendingUp size={24} color="#10b981" />
                </View>
                <Text style={styles.statValue}>
                  {isUsingOfflineStats
                    ? (offlineStats?.totalTickets || 0)
                    : (onlineStats?.total || 0)
                  }
                </Text>
                <Text style={styles.statLabel}>
                  {isUsingOfflineStats ? 'Downloaded' : 'Total'}
                </Text>
              </View>
            </>
          )}
        </View>

        {isOfflineMode && offlineStatsQuery.data && offlineStatsQuery.data.unsyncedScans > 0 && (
          <View style={styles.syncNotice}>
            <AlertCircle size={20} color="#ef4444" />
            <Text style={styles.syncText}>
              {offlineStatsQuery.data.unsyncedScans} scan(s) pending sync
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Quick Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Hold phone steady when scanning QR codes</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Green = Valid ticket</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Red = Invalid or already used</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Yellow = Last valid scan</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  } as const,
  roleContainer: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  roleText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  } as const,
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  offlineText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  } as const,
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  } as const,
  statLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  } as const,
  syncNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  syncText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  } as const,
  infoCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  } as const,
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  tipBullet: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '700',
  } as const,
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
});
