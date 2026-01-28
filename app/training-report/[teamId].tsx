
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';

interface PlayerTrainingReport {
  playerId: string;
  name: string;
  trained: number;
  injured: number;
  excused: number;
  noContact: number;
}

export default function TrainingReportScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<PlayerTrainingReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  console.log('TrainingReportScreen: Rendering training report', { teamId });

  const fetchReports = useCallback(async () => {
    if (!teamId) {
      console.log('TrainingReportScreen: No teamId provided');
      setLoading(false);
      return;
    }

    console.log('TrainingReportScreen: Fetching training reports for team:', teamId);
    setLoading(true);

    try {
      const data = await authenticatedGet<PlayerTrainingReport[]>(
        `/api/teams/${teamId}/training-reports/players`
      );
      console.log('TrainingReportScreen: Training reports fetched:', data.length, 'players');
      setReports(data);
    } catch (error) {
      console.error('TrainingReportScreen: Failed to fetch training reports:', error);
      setErrorMessage('Failed to load training reports');
      setShowErrorModal(true);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Auto-refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('TrainingReportScreen: Screen focused, refreshing reports');
      fetchReports();
    }, [fetchReports])
  );

  const handlePlayerPress = (playerId: string, playerName: string) => {
    console.log('TrainingReportScreen: User tapped player:', playerName);
    router.push({
      pathname: '/player-training-report/[teamId]/[playerId]',
      params: { teamId, playerId, playerName },
    });
  };

  const filteredReports = reports.filter((report) =>
    report.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSessions = reports.length > 0 
    ? Math.max(...reports.map(r => r.trained + r.injured + r.excused + r.noContact))
    : 0;

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Training Report',
            headerBackTitle: 'Back',
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading training reports...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Training Report',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color="#666"
            />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search players..."
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {filteredReports.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="figure.run"
                android_material_icon_name="directions-run"
                size={64}
                color="#666"
              />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Players Found' : 'No Training Data Yet'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Training attendance will appear here once sessions are recorded'}
              </Text>
            </View>
          ) : (
            <View style={styles.playersList}>
              {filteredReports.map((report) => {
                const totalAttendance = report.trained + report.injured + report.excused + report.noContact;
                const trainedPercentage = totalAttendance > 0 
                  ? Math.round((report.trained / totalAttendance) * 100)
                  : 0;
                
                const trainedText = `${report.trained}`;
                const injuredText = `${report.injured}`;
                const excusedText = `${report.excused}`;
                const noContactText = `${report.noContact}`;
                const percentageText = `${trainedPercentage}%`;

                return (
                  <TouchableOpacity
                    key={report.playerId}
                    style={styles.playerCard}
                    onPress={() => handlePlayerPress(report.playerId, report.name)}
                  >
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{report.name}</Text>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{trainedText}</Text>
                          <Text style={styles.statLabel}>Trained</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, styles.injuredValue]}>{injuredText}</Text>
                          <Text style={styles.statLabel}>Injured</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, styles.excusedValue]}>{excusedText}</Text>
                          <Text style={styles.statLabel}>Excused</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, styles.noContactValue]}>{noContactText}</Text>
                          <Text style={styles.statLabel}>No Contact</Text>
                        </View>
                      </View>
                      <View style={styles.attendanceBar}>
                        <View style={styles.attendanceBarFill} />
                        <Text style={styles.attendancePercentage}>{percentageText}</Text>
                      </View>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="arrow-forward"
                      size={20}
                      color="#999"
                    />
                  </TouchableOpacity>
                );
              })}
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  playersList: {
    gap: 12,
  },
  playerCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerInfo: {
    flex: 1,
    gap: 8,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
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
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  attendanceBar: {
    height: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#28a745',
    borderRadius: 12,
  },
  attendancePercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    zIndex: 1,
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
