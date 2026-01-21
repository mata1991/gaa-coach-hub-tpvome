
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { colors } from '@/styles/commonStyles';
import { TrainingSession, TrainingAttendance, TrainingStatus, Player } from '@/types';

type FilterType = 'ALL' | 'TRAINED' | 'INJURED' | 'EXCUSED' | 'NO_CONTACT';

export default function TrainingAttendanceScreen() {
  const router = useRouter();
  const { sessionId, teamId } = useLocalSearchParams<{ sessionId: string; teamId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Map<string, TrainingStatus>>(new Map());
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  console.log('[TrainingAttendance] Rendering attendance screen', { sessionId, teamId });

  useEffect(() => {
    fetchData();
  }, [sessionId, teamId]);

  const fetchData = async () => {
    console.log('[TrainingAttendance] Fetching session and attendance data');
    try {
      setLoading(true);
      
      // Fetch session details with attendance
      const sessionData = await authenticatedGet<TrainingSession & { attendance: TrainingAttendance[] }>(
        `/api/training-sessions/${sessionId}`
      );
      console.log('[TrainingAttendance] Session data fetched:', sessionData);
      
      setSession(sessionData);
      
      // Fetch all players for the team
      const playersData = await authenticatedGet<Player[]>(`/api/players?teamId=${teamId}`);
      console.log('[TrainingAttendance] Players fetched:', playersData.length);
      
      setPlayers(playersData);
      
      // Build attendance map
      const attendanceMap = new Map<string, TrainingStatus>();
      if (sessionData.attendance) {
        sessionData.attendance.forEach((att: TrainingAttendance) => {
          attendanceMap.set(att.playerId, att.status);
        });
      }
      
      // Set default status for players without attendance
      playersData.forEach((player) => {
        if (!attendanceMap.has(player.id)) {
          attendanceMap.set(player.id, 'NO_CONTACT');
        }
      });
      
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('[TrainingAttendance] Failed to fetch data:', error);
      Alert.alert('Error', 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (playerId: string, status: TrainingStatus) => {
    console.log('[TrainingAttendance] Status changed for player:', playerId, status);
    
    // Update local state immediately
    const newAttendance = new Map(attendance);
    newAttendance.set(playerId, status);
    setAttendance(newAttendance);
    
    // Save to backend
    await saveAttendance(playerId, status);
  };

  const saveAttendance = async (playerId: string, status: TrainingStatus) => {
    try {
      setSaving(true);
      
      const payload = {
        attendance: [{ playerId, status }],
      };
      
      console.log('[TrainingAttendance] Saving attendance:', payload);
      
      await authenticatedPost(`/api/training-sessions/${sessionId}/attendance`, payload);
      
      setLastSaved(new Date());
      console.log('[TrainingAttendance] Attendance saved successfully');
    } catch (error) {
      console.error('[TrainingAttendance] Failed to save attendance:', error);
      Alert.alert('Error', 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAction = async (action: 'MARK_ALL_TRAINED' | 'RESET_ALL') => {
    console.log('[TrainingAttendance] Bulk action:', action);
    
    const newStatus: TrainingStatus = action === 'MARK_ALL_TRAINED' ? 'TRAINED' : 'NO_CONTACT';
    const newAttendance = new Map<string, TrainingStatus>();
    
    players.forEach((player) => {
      newAttendance.set(player.id, newStatus);
    });
    
    setAttendance(newAttendance);
    
    // Save all to backend
    try {
      setSaving(true);
      
      const payload = {
        attendance: players.map((player) => ({
          playerId: player.id,
          status: newStatus,
        })),
      };
      
      console.log('[TrainingAttendance] Saving bulk attendance');
      
      await authenticatedPost(`/api/training-sessions/${sessionId}/attendance`, payload);
      
      setLastSaved(new Date());
      console.log('[TrainingAttendance] Bulk attendance saved');
    } catch (error) {
      console.error('[TrainingAttendance] Failed to save bulk attendance:', error);
      Alert.alert('Error', 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredPlayers = () => {
    if (filter === 'ALL') return players;
    
    return players.filter((player) => {
      const status = attendance.get(player.id);
      return status === filter;
    });
  };

  const getCounts = () => {
    const counts = {
      trained: 0,
      injured: 0,
      excused: 0,
      noContact: 0,
    };
    
    attendance.forEach((status) => {
      if (status === 'TRAINED') counts.trained++;
      else if (status === 'INJURED') counts.injured++;
      else if (status === 'EXCUSED') counts.excused++;
      else if (status === 'NO_CONTACT') counts.noContact++;
    });
    
    return counts;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Training Attendance', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Training Attendance', headerShown: true }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sessionDate = new Date(session.dateTime);
  const dateStr = sessionDate.toLocaleDateString();
  const timeStr = sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const filteredPlayers = getFilteredPlayers();
  const counts = getCounts();
  const lastSavedStr = lastSaved ? lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Training Attendance',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Session Info */}
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionDate}>{dateStr}</Text>
          <Text style={styles.sessionTime}>{timeStr}</Text>
          {session.location && (
            <Text style={styles.sessionLocation}>{session.location}</Text>
          )}
          {session.focus && (
            <Text style={styles.sessionFocus}>{session.focus}</Text>
          )}
        </View>

        {/* Save Status */}
        <View style={styles.saveStatus}>
          {saving ? (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          ) : lastSaved ? (
            <Text style={styles.savedText}>✓ Saved at {lastSavedStr}</Text>
          ) : null}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{counts.trained}</Text>
            <Text style={styles.summaryLabel}>Trained</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.injuredValue]}>{counts.injured}</Text>
            <Text style={styles.summaryLabel}>Injured</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.excusedValue]}>{counts.excused}</Text>
            <Text style={styles.summaryLabel}>Excused</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.noContactValue]}>{counts.noContact}</Text>
            <Text style={styles.summaryLabel}>No Contact</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          <View style={styles.filters}>
            {(['ALL', 'TRAINED', 'INJURED', 'EXCUSED', 'NO_CONTACT'] as FilterType[]).map((f) => {
              const isActive = filter === f;
              const label = f === 'ALL' ? 'All' : f === 'TRAINED' ? 'Training' : f === 'INJURED' ? 'Injured' : f === 'EXCUSED' ? 'Excused' : 'No Contact';
              
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterButton, isActive && styles.filterButtonActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Bulk Actions */}
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => handleBulkAction('MARK_ALL_TRAINED')}
          >
            <Text style={styles.bulkButtonText}>Mark All Training</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkButton, styles.bulkButtonSecondary]}
            onPress={() => handleBulkAction('RESET_ALL')}
          >
            <Text style={[styles.bulkButtonText, styles.bulkButtonTextSecondary]}>Reset All</Text>
          </TouchableOpacity>
        </View>

        {/* Players List */}
        <ScrollView style={styles.playersList}>
          {filteredPlayers.map((player) => {
            const status = attendance.get(player.id) || 'NO_CONTACT';
            const playerName = player.name;
            
            return (
              <View key={player.id} style={styles.playerCard}>
                <Text style={styles.playerName}>{playerName}</Text>
                
                <View style={styles.statusButtons}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      status === 'TRAINED' && styles.statusButtonTrained,
                    ]}
                    onPress={() => handleStatusChange(player.id, 'TRAINED')}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      status === 'TRAINED' && styles.statusButtonTextActive,
                    ]}>
                      Training
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      status === 'INJURED' && styles.statusButtonInjured,
                    ]}
                    onPress={() => handleStatusChange(player.id, 'INJURED')}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      status === 'INJURED' && styles.statusButtonTextActive,
                    ]}>
                      Injured
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      status === 'EXCUSED' && styles.statusButtonExcused,
                    ]}
                    onPress={() => handleStatusChange(player.id, 'EXCUSED')}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      status === 'EXCUSED' && styles.statusButtonTextActive,
                    ]}>
                      Excused
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      status === 'NO_CONTACT' && styles.statusButtonNoContact,
                    ]}
                    onPress={() => handleStatusChange(player.id, 'NO_CONTACT')}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      status === 'NO_CONTACT' && styles.statusButtonTextActive,
                    ]}>
                      No Contact
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
  },
  sessionHeader: {
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionDate: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sessionTime: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sessionLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sessionFocus: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: 4,
  },
  saveStatus: {
    padding: 8,
    alignItems: 'center',
    minHeight: 32,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  savedText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  injuredValue: {
    color: '#dc3545',
  },
  excusedValue: {
    color: '#ffc107',
  },
  noContactValue: {
    color: '#6c757d',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  filtersContainer: {
    maxHeight: 60,
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  bulkActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  bulkButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  bulkButtonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bulkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  bulkButtonTextSecondary: {
    color: colors.text,
  },
  playersList: {
    flex: 1,
    padding: 16,
  },
  playerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.highlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusButtonTrained: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  statusButtonInjured: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  statusButtonExcused: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  statusButtonNoContact: {
    backgroundColor: '#e2e3e5',
    borderColor: '#6c757d',
  },
  statusButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  statusButtonTextActive: {
    fontWeight: '600',
  },
});
