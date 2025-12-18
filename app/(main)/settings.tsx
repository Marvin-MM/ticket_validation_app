import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LogOut, Download, RefreshCw, Trash2, User, Wifi } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import { api } from '@/lib/api';
import { clearDatabase, saveOfflineData, getOfflineStats } from '@/lib/database';
import type { OfflineDownloadResponse, OfflineSyncResponse } from '@/types/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { manager, clearAuth } = useAuthStore();
  const { isOfflineMode, setOfflineMode, setLastSyncTime, lastSyncTime, isOnline } = useAppStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const offlineStatsQuery = useQuery({
    queryKey: ['offline-stats'],
    queryFn: getOfflineStats,
    refetchInterval: 5000,
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get<OfflineDownloadResponse>('/api/v1/validation/offline/download');
      return response.data;
    },
    onSuccess: async (data) => {
      await saveOfflineData(data.data.campaigns, data.data.tickets);
      setLastSyncTime(new Date().toISOString());
      Alert.alert(
        'Download Complete',
        `Downloaded ${data.data.tickets.length} tickets from ${data.data.campaigns.length} campaign(s)`,
        [{ text: 'OK' }]
      );
      offlineStatsQuery.refetch();
    },
    onError: (error: any) => {
      console.error('[Download] Error:', error.response?.data);
      Alert.alert(
        'Download Failed',
        error.response?.data?.message || 'Failed to download offline data',
        [{ text: 'OK' }]
      );
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { getUnsyncedLogs, markLogsAsSynced } = await import('@/lib/database');
      const logs = await getUnsyncedLogs();
      
      if (logs.length === 0) {
        return { synced: 0, conflicts: 0 };
      }

      const response = await api.post<OfflineSyncResponse>('/api/v1/validation/offline/sync', {
        offlineValidations: logs.map(log => ({
          ticketId: log.ticketId,
          campaignId: log.campaignId,
          timestamp: log.timestamp,
        })),
      });

      await markLogsAsSynced();
      return response.data;
    },
    onSuccess: (data) => {
      setLastSyncTime(new Date().toISOString());
      Alert.alert(
        'Sync Complete',
        `Synced ${data.synced} validation(s)${data.conflicts > 0 ? `\n${data.conflicts} conflict(s) detected` : ''}`,
        [{ text: 'OK' }]
      );
      offlineStatsQuery.refetch();
    },
    onError: (error: any) => {
      console.error('[Sync] Error:', error.response?.data);
      Alert.alert(
        'Sync Failed',
        error.response?.data?.message || 'Failed to sync offline data',
        [{ text: 'OK' }]
      );
    },
  });

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? Unsynced data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await api.post('/api/v1/auth/logout');
            } catch (error) {
              console.log('[Logout] API call failed:', error);
            }
            
            await clearDatabase();
            clearAuth();
            setOfflineMode(false);
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleClearOfflineData = () => {
    Alert.alert(
      'Clear Offline Data',
      'This will delete all downloaded tickets and unsynced scans. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearDatabase();
            setOfflineMode(false);
            Alert.alert('Cleared', 'Offline data has been cleared', [{ text: 'OK' }]);
            offlineStatsQuery.refetch();
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconContainer}>
                <User size={20} color="#2563eb" />
              </View>
              <View style={styles.info}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{manager?.name || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.iconContainer}>
                <User size={20} color="#2563eb" />
              </View>
              <View style={styles.info}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{manager?.role || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offline Mode</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconContainer}>
                <Wifi size={20} color={isOfflineMode ? '#f59e0b' : '#10b981'} />
              </View>
              <View style={styles.info}>
                <Text style={styles.infoLabel}>Enable Offline Mode</Text>
                <Text style={styles.infoDescription}>
                  Scan tickets without internet connection
                </Text>
              </View>
              <Switch
                value={isOfflineMode}
                onValueChange={setOfflineMode}
                trackColor={{ false: '#3a3a3a', true: '#2563eb' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Downloaded Tickets</Text>
              <Text style={styles.statValue}>{offlineStatsQuery.data?.totalTickets || 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Scans</Text>
              <Text style={styles.statValue}>{offlineStatsQuery.data?.totalScans || 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Pending Sync</Text>
              <Text style={[styles.statValue, offlineStatsQuery.data?.unsyncedScans ? styles.statValueWarning : undefined]}>
                {offlineStatsQuery.data?.unsyncedScans || 0}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Last Sync</Text>
              <Text style={styles.statValueSmall}>{formatDate(lastSyncTime)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, (!isOnline || downloadMutation.isPending) && styles.buttonDisabled]}
            onPress={() => downloadMutation.mutate()}
            disabled={!isOnline || downloadMutation.isPending}
          >
            {downloadMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Download size={20} color="#fff" />
                <Text style={styles.buttonText}>Download Tickets</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, (!isOnline || syncMutation.isPending || !offlineStatsQuery.data?.unsyncedScans) && styles.buttonDisabled]}
            onPress={() => syncMutation.mutate()}
            disabled={!isOnline || syncMutation.isPending || !offlineStatsQuery.data?.unsyncedScans}
          >
            {syncMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <RefreshCw size={20} color="#fff" />
                <Text style={styles.buttonText}>Sync Data</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleClearOfflineData}
          >
            <Trash2 size={20} color="#fff" />
            <Text style={styles.buttonText}>Clear Offline Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.buttonDanger, isLoggingOut && styles.buttonDisabled]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <LogOut size={20} color="#fff" />
                <Text style={styles.buttonText}>Logout</Text>
              </>
            )}
          </TouchableOpacity>
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  } as const,
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as const,
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  } as const,
  infoDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 12,
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
  },
  statValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  } as const,
  statValueWarning: {
    color: '#ef4444',
  },
  statValueSmall: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  } as const,
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  buttonSecondary: {
    backgroundColor: '#10b981',
  },
  buttonDanger: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  } as const,
});
