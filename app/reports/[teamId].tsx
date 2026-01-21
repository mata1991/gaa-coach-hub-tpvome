
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
import { authenticatedGet } from '@/utils/api';
import { Fixture } from '@/types';

export default function ReportsScreen() {
  const router = useRouter();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [completedFixtures, setCompletedFixtures] = useState<Fixture[]>([]);

  console.log('ReportsScreen: Rendering reports', { teamId });

  const fetchCompletedFixtures = React.useCallback(async () => {
    console.log('Fetching completed fixtures for team:', teamId);
    setLoading(true);

    try {
      const data = await authenticatedGet(`/api/fixtures?teamId=${teamId}&status=completed`);
      console.log('Completed fixtures fetched:', data);
      setCompletedFixtures(data);
    } catch (error) {
      console.error('Failed to fetch completed fixtures:', error);
      Alert.alert('Error', 'Failed to load completed fixtures');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchCompletedFixtures();
  }, [fetchCompletedFixtures]);

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
    console.log('User tapped View Season Dashboard');
    router.push({
      pathname: '/season-dashboard/[teamId]',
      params: { teamId },
    });
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

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Match Reports</Text>
                <View style={styles.fixturesList}>
                  {completedFixtures.map((fixture) => {
                    const fixtureDate = new Date(fixture.date);
                    const dateStr = fixtureDate.toLocaleDateString();
                    
                    return (
                      <View key={fixture.id} style={styles.fixtureCard}>
                        <View style={styles.fixtureInfo}>
                          <Text style={styles.fixtureOpponent}>{fixture.opponent}</Text>
                          <Text style={styles.fixtureDate}>{dateStr}</Text>
                          {fixture.venue && (
                            <Text style={styles.fixtureVenue}>{fixture.venue}</Text>
                          )}
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
  fixtureInfo: {
    gap: 4,
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
});
