
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
import { authenticatedGet, authenticatedDelete } from '@/utils/api';
import { colors } from '@/styles/commonStyles';
import { TrainingSession } from '@/types';

export default function TrainingSessionsScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  console.log('[TrainingSessions] Rendering training sessions list', { teamId });

  useEffect(() => {
    fetchSessions();
  }, [teamId]);

  const fetchSessions = async () => {
    console.log('[TrainingSessions] Fetching training sessions');
    try {
      setLoading(true);
      const sessionsData = await authenticatedGet<TrainingSession[]>(
        `/api/training-sessions?teamId=${teamId}`
      );
      console.log('[TrainingSessions] Fetched sessions:', sessionsData.length);
      
      // Sort by date descending (most recent first)
      const sortedSessions = sessionsData.sort((a, b) => 
        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      );
      
      setSessions(sortedSessions);
    } catch (error) {
      console.error('[TrainingSessions] Failed to fetch sessions:', error);
      Alert.alert('Error', 'Failed to load training sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = () => {
    console.log('[TrainingSessions] User tapped Create Session');
    router.push({
      pathname: '/create-training-session/[teamId]',
      params: { teamId },
    });
  };

  const handleSessionPress = (session: TrainingSession) => {
    console.log('[TrainingSessions] User tapped session:', session.id);
    router.push({
      pathname: '/training-attendance/[sessionId]',
      params: { sessionId: session.id, teamId },
    });
  };

  const handleDeleteSession = async (session: TrainingSession) => {
    const sessionDate = new Date(session.dateTime);
    const dateStr = sessionDate.toLocaleDateString();
    const timeStr = sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    Alert.alert(
      'Delete Training Session',
      `Delete session on ${dateStr} at ${timeStr}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[TrainingSessions] Deleting session:', session.id);
              await authenticatedDelete(`/api/training-sessions/${session.id}`);
              await fetchSessions();
              Alert.alert('Success', 'Training session deleted');
            } catch (error) {
              console.error('[TrainingSessions] Failed to delete session:', error);
              Alert.alert('Error', 'Failed to delete session');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Training Sessions', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Training Sessions',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="figure.run"
                android_material_icon_name="directions-run"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No Training Sessions</Text>
              <Text style={styles.emptyText}>
                Create your first training session to track attendance
              </Text>
            </View>
          ) : (
            <View style={styles.sessionsList}>
              {sessions.map((session) => {
                const sessionDate = new Date(session.dateTime);
                const dateStr = sessionDate.toLocaleDateString();
                const timeStr = sessionDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                
                const counts = session.attendanceCounts;
                const totalTracked = counts 
                  ? counts.trained + counts.injured + counts.excused 
                  : 0;
                const noContact = counts?.noContact || 0;

                return (
                  <View key={session.id} style={styles.sessionCard}>
                    <TouchableOpacity
                      style={styles.sessionMain}
                      onPress={() => handleSessionPress(session)}
                    >
                      <View style={styles.sessionIcon}>
                        <IconSymbol
                          ios_icon_name="figure.run"
                          android_material_icon_name="directions-run"
                          size={28}
                          color={colors.primary}
                        />
                      </View>
                      
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionDate}>{dateStr}</Text>
                        <Text style={styles.sessionTime}>{timeStr}</Text>
                        {session.location && (
                          <Text style={styles.sessionLocation}>{session.location}</Text>
                        )}
                        {session.focus && (
                          <Text style={styles.sessionFocus}>{session.focus}</Text>
                        )}
                        
                        {counts && (
                          <View style={styles.attendanceSummary}>
                            <View style={styles.attendanceBadge}>
                              <Text style={styles.attendanceBadgeText}>
                                ✓ {counts.trained}
                              </Text>
                            </View>
                            {counts.injured > 0 && (
                              <View style={[styles.attendanceBadge, styles.injuredBadge]}>
                                <Text style={styles.attendanceBadgeText}>
                                  🤕 {counts.injured}
                                </Text>
                              </View>
                            )}
                            {counts.excused > 0 && (
                              <View style={[styles.attendanceBadge, styles.excusedBadge]}>
                                <Text style={styles.attendanceBadgeText}>
                                  ⚠️ {counts.excused}
                                </Text>
                              </View>
                            )}
                            {noContact > 0 && (
                              <View style={[styles.attendanceBadge, styles.noContactBadge]}>
                                <Text style={styles.attendanceBadgeText}>
                                  ? {noContact}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                      
                      <IconSymbol
                        ios_icon_name="chevron.right"
                        android_material_icon_name="chevron-right"
                        size={24}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteSession(session)}
                    >
                      <IconSymbol
                        ios_icon_name="trash"
                        android_material_icon_name="delete"
                        size={20}
                        color="#dc3545"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateSession}
          >
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add-circle"
              size={24}
              color="#fff"
            />
            <Text style={styles.createButtonText}>Create Training Session</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  sessionsList: {
    gap: 12,
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sessionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sessionTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sessionLocation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sessionFocus: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
  },
  attendanceSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  attendanceBadge: {
    backgroundColor: '#d4edda',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  injuredBadge: {
    backgroundColor: '#f8d7da',
  },
  excusedBadge: {
    backgroundColor: '#fff3cd',
  },
  noContactBadge: {
    backgroundColor: '#e2e3e5',
  },
  attendanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  deleteButton: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
