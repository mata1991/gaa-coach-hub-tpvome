
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';

interface PlayerTrainingReportDetail {
  playerId: string;
  name: string;
  counts: {
    trained: number;
    injured: number;
    excused: number;
    noContact: number;
  };
  sessions: Array<{
    date: string;
    sessionId: string;
    sessionTitle: string;
    status: 'TRAINED' | 'INJURED' | 'EXCUSED' | 'NO_CONTACT';
  }>;
}

export default function PlayerTrainingReportScreen() {
  const { teamId, playerId, playerName } = useLocalSearchParams<{
    teamId: string;
    playerId: string;
    playerName: string;
  }>();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<PlayerTrainingReportDetail | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  console.log('PlayerTrainingReportScreen: Rendering player training report', { teamId, playerId, playerName });

  const fetchReport = useCallback(async () => {
    if (!teamId || !playerId) {
      console.log('PlayerTrainingReportScreen: Missing teamId or playerId');
      setLoading(false);
      return;
    }

    console.log('PlayerTrainingReportScreen: Fetching training report for player:', playerId);
    setLoading(true);

    try {
      const data = await authenticatedGet<PlayerTrainingReportDetail>(
        `/api/teams/${teamId}/training-reports/players/${playerId}`
      );
      console.log('PlayerTrainingReportScreen: Player training report fetched:', data);
      setReport(data);
    } catch (error) {
      console.error('PlayerTrainingReportScreen: Failed to fetch player training report:', error);
      setErrorMessage('Failed to load player training report');
      setShowErrorModal(true);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, playerId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Auto-refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('PlayerTrainingReportScreen: Screen focused, refreshing report');
      fetchReport();
    }, [fetchReport])
  );

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: playerName || 'Player Report',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading report...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: playerName || 'Player Report',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.errorContainer}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle"
              android_material_icon_name="error"
              size={64}
              color="#dc3545"
            />
            <Text style={styles.errorTitle}>No Data Available</Text>
            <Text style={styles.errorText}>
              No training data found for this player
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const trainedText = `${report.counts.trained}`;
  const injuredText = `${report.counts.injured}`;
  const excusedText = `${report.counts.excused}`;
  const noContactText = `${report.counts.noContact}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TRAINED':
        return '#28a745';
      case 'INJURED':
        return '#dc3545';
      case 'EXCUSED':
        return '#ffc107';
      case 'NO_CONTACT':
        return '#6c757d';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'TRAINED':
        return 'Trained';
      case 'INJURED':
        return 'Injured';
      case 'EXCUSED':
        return 'Excused';
      case 'NO_CONTACT':
        return 'No Contact';
      default:
        return status;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: report.name,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Summary Counters */}
          <View style={styles.countersContainer}>
            <View style={styles.counterCard}>
              <Text style={styles.counterValue}>{trainedText}</Text>
              <Text style={styles.counterLabel}>Trained</Text>
            </View>
            <View style={styles.counterCard}>
              <Text style={[styles.counterValue, styles.injuredValue]}>{injuredText}</Text>
              <Text style={styles.counterLabel}>Injured</Text>
            </View>
            <View style={styles.counterCard}>
              <Text style={[styles.counterValue, styles.excusedValue]}>{excusedText}</Text>
              <Text style={styles.counterLabel}>Excused</Text>
            </View>
            <View style={styles.counterCard}>
              <Text style={[styles.counterValue, styles.noContactValue]}>{noContactText}</Text>
              <Text style={styles.counterLabel}>No Contact</Text>
            </View>
          </View>

          {/* Session History */}
          {report.sessions.length > 0 && (
            <View style={styles.sessionsSection}>
              <Text style={styles.sectionTitle}>Session History</Text>
              <View style={styles.sessionsList}>
                {report.sessions.map((session, index) => {
                  const sessionDate = new Date(session.date);
                  const dateStr = sessionDate.toLocaleDateString();
                  const statusLabel = getStatusLabel(session.status);
                  const statusColor = getStatusColor(session.status);
                  const sessionTitle = session.sessionTitle || 'Training Session';

                  return (
                    <View key={`${session.sessionId}-${index}`} style={styles.sessionCard}>
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionDate}>{dateStr}</Text>
                        <Text style={styles.sessionTitle}>{sessionTitle}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusBadgeText}>{statusLabel}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {report.sessions.length === 0 && (
            <View style={styles.emptySessionsState}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="event"
                size={48}
                color="#999"
              />
              <Text style={styles.emptySessionsText}>
                No training sessions recorded yet
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Error Modal */}
        <Modal
          visible={showErrorModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowErrorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.errorModal}>
              <Text style={styles.errorModalTitle}>Error</Text>
              <Text style={styles.errorModalMessage}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.errorModalButton}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.errorModalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  countersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  counterCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  counterValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
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
  counterLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  sessionsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  sessionsList: {
    gap: 8,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sessionTitle: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptySessionsState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptySessionsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  errorModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorModalButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
