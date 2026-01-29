
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedDelete } from '@/utils/api';
import { Fixture } from '@/types';

export default function ReportsScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [completedFixtures, setCompletedFixtures] = useState<Fixture[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fixtureToDelete, setFixtureToDelete] = useState<Fixture | null>(null);
  const [deleting, setDeleting] = useState(false);

  console.log('ReportsScreen: Rendering reports', { teamId });

  const fetchCompletedFixtures = useCallback(async () => {
    console.log('ReportsScreen: Fetching completed fixtures for team:', teamId);
    setLoading(true);

    try {
      const data = await authenticatedGet(`/api/fixtures?teamId=${teamId}&status=completed`);
      console.log('ReportsScreen: Completed fixtures fetched:', data);
      setCompletedFixtures(data);
    } catch (error) {
      console.error('ReportsScreen: Failed to fetch completed fixtures:', error);
      setErrorMessage('Failed to load completed fixtures');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchCompletedFixtures();
  }, [fetchCompletedFixtures]);

  // Auto-refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('ReportsScreen: Screen focused, refreshing data');
      fetchCompletedFixtures();
    }, [fetchCompletedFixtures])
  );

  const handleViewReport = (fixtureId: string) => {
    console.log('User tapped View Report for fixture:', fixtureId);
    router.push({
      pathname: '/match-report/[fixtureId]',
      params: { fixtureId },
    });
  };

  const handleViewBenchmarks = (fixtureId: string) => {
    console.log('User tapped View Benchmarks for fixture:', fixtureId);
    router.push({
      pathname: '/match-report/[fixtureId]/benchmarks',
      params: { fixtureId },
    });
  };

  const handleViewSeasonDashboard = () => {
    console.log('ReportsScreen: User tapped View Season Dashboard');
    router.push({
      pathname: '/season-dashboard/[teamId]',
      params: { teamId },
    });
  };

  const handleViewTrainingReport = () => {
    console.log('ReportsScreen: User tapped View Training Report');
    router.push({
      pathname: '/training-report/[teamId]',
      params: { teamId },
    });
  };

  const handleDeleteFixture = (fixture: Fixture) => {
    console.log('ReportsScreen: User tapped Delete for fixture:', fixture.id);
    setFixtureToDelete(fixture);
    setShowDeleteModal(true);
  };

  const confirmDeleteFixture = async () => {
    if (!fixtureToDelete) {
      console.error('ReportsScreen: No fixture to delete');
      return;
    }

    console.log('ReportsScreen: Confirming delete for fixture:', fixtureToDelete.id);
    setDeleting(true);

    try {
      await authenticatedDelete(`/api/fixtures/${fixtureToDelete.id}`);
      console.log('ReportsScreen: Fixture deleted successfully');
      
      // Optimistic update: remove from list immediately
      setCompletedFixtures((prev) => prev.filter((f) => f.id !== fixtureToDelete.id));
      
      setShowDeleteModal(false);
      setFixtureToDelete(null);
      
      // Refetch to confirm
      fetchCompletedFixtures();
    } catch (error) {
      console.error('ReportsScreen: Failed to delete fixture:', error);
      setErrorMessage('Failed to delete fixture. Please try again.');
      setShowErrorModal(true);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteFixture = () => {
    console.log('ReportsScreen: User cancelled delete');
    setShowDeleteModal(false);
    setFixtureToDelete(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Reports',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {completedFixtures.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="chart.bar"
                android_material_icon_name="assessment"
                size={64}
                color="#666"
              />
              <Text style={styles.emptyTitle}>No Reports Yet</Text>
              <Text style={styles.emptyText}>
                Complete a match to view reports and analytics
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.seasonButton}
                onPress={handleViewSeasonDashboard}
              >
                <View style={styles.seasonButtonContent}>
                  <IconSymbol
                    ios_icon_name="chart.line.uptrend.xyaxis"
                    android_material_icon_name="trending-up"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.seasonButtonText}>View Season Dashboard</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="arrow-forward"
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.trainingButton}
                onPress={handleViewTrainingReport}
              >
                <View style={styles.trainingButtonContent}>
                  <IconSymbol
                    ios_icon_name="figure.run"
                    android_material_icon_name="directions-run"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.trainingButtonText}>Training Report</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="arrow-forward"
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Match Reports</Text>
                <View style={styles.fixturesList}>
                  {completedFixtures.map((fixture) => {
                    const fixtureDate = new Date(fixture.date);
                    const dateStr = fixtureDate.toLocaleDateString();
                    
                    return (
                      <View key={fixture.id} style={styles.fixtureCard}>
                        <View style={styles.fixtureHeader}>
                          <View style={styles.fixtureInfo}>
                            <Text style={styles.fixtureOpponent}>{fixture.opponent}</Text>
                            <Text style={styles.fixtureDate}>{dateStr}</Text>
                            {fixture.venue && (
                              <Text style={styles.fixtureVenue}>{fixture.venue}</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteFixture(fixture)}
                          >
                            <IconSymbol
                              ios_icon_name="trash"
                              android_material_icon_name="delete"
                              size={20}
                              color="#dc3545"
                            />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.fixtureActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleViewReport(fixture.id)}
                          >
                            <Text style={styles.actionButtonText}>View Report</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.secondaryActionButton}
                            onPress={() => handleViewBenchmarks(fixture.id)}
                          >
                            <Text style={styles.secondaryActionButtonText}>Benchmarks</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
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

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={cancelDeleteFixture}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModal}>
              <Text style={styles.deleteModalTitle}>Delete Match Report?</Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to delete the match report for {fixtureToDelete?.opponent}? This will also delete all match events and statistics. This action cannot be undone.
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelDeleteFixture}
                  disabled={deleting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDeleteButton}
                  onPress={confirmDeleteFixture}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#fff',
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
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 8,
  },
  seasonButton: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  seasonButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seasonButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  trainingButton: {
    backgroundColor: '#28a745',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  trainingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainingButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  fixturesList: {
    gap: 12,
  },
  fixtureCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  fixtureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  fixtureInfo: {
    flex: 1,
    gap: 4,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  fixtureOpponent: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  fixtureDate: {
    fontSize: 14,
    color: '#666',
  },
  fixtureVenue: {
    fontSize: 14,
    color: '#666',
  },
  fixtureActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryActionButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
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
  deleteModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
