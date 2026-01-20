
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';

const { width } = Dimensions.get('window');

interface SeasonDashboard {
  seasonStats: {
    totalMatches: number;
    wins: number;
    losses: number;
    draws: number;
    averagePoints: number;
    averageGoals: number;
    averageWides: number;
    averagePuckoutWinRate: number;
  };
  trends: Array<{
    fixtureId: string;
    date: string;
    opponent: string;
    points: number;
    goals: number;
    wides: number;
    puckoutWinRate: number;
    conversionRate: number;
  }>;
  leagueVsChampionship: {
    league: {
      matches: number;
      avgPoints: number;
      avgGoals: number;
      winRate: number;
    };
    championship: {
      matches: number;
      avgPoints: number;
      avgGoals: number;
      winRate: number;
    };
  };
}

export default function SeasonDashboardScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const seasonId = params.seasonId as string;

  const [data, setData] = useState<SeasonDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'points' | 'goals' | 'wides' | 'puckoutWinRate'>('points');

  useEffect(() => {
    fetchDashboard();
  }, [teamId, seasonId]);

  const fetchDashboard = async () => {
    try {
      console.log('[SeasonDashboard] Fetching dashboard for team:', teamId, 'season:', seasonId);
      setLoading(true);
      const url = seasonId
        ? `/api/teams/${teamId}/season-dashboard?seasonId=${seasonId}`
        : `/api/teams/${teamId}/season-dashboard`;
      const result = await authenticatedGet<SeasonDashboard>(url);
      console.log('[SeasonDashboard] Fetched dashboard:', result);
      setData(result);
    } catch (error) {
      console.error('[SeasonDashboard] Error fetching dashboard:', error);
      Alert.alert('Error', 'Failed to load season dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSeasonCSV = async () => {
    try {
      console.log('[SeasonDashboard] User tapped season CSV export');
      
      // Fetch CSV data from backend
      const { BACKEND_URL, getBearerToken } = await import('@/utils/api');
      const token = await getBearerToken();
      
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }
      
      const url = seasonId
        ? `${BACKEND_URL}/api/teams/${teamId}/export/csv?seasonId=${seasonId}`
        : `${BACKEND_URL}/api/teams/${teamId}/export/csv`;
      console.log('[SeasonDashboard] Fetching CSV from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to export CSV: ${response.status}`);
      }
      
      const csvText = await response.text();
      console.log('[SeasonDashboard] CSV data received, length:', csvText.length);
      
      if (Platform.OS === 'web') {
        // Web: Download as file
        const blob = new Blob([csvText], { type: 'text/csv' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `season-${teamId}-summary.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        Alert.alert('Success', 'Season CSV downloaded');
      } else {
        // Native: Share via share sheet
        const { Share } = await import('react-native');
        await Share.share({
          message: csvText,
          title: 'Season Summary',
        });
      }
    } catch (error) {
      console.error('[SeasonDashboard] Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export season CSV');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Season Dashboard',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Season Dashboard',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No dashboard data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getMetricValue = (trend: SeasonDashboard['trends'][0]) => {
    switch (selectedMetric) {
      case 'points':
        return trend.points;
      case 'goals':
        return trend.goals;
      case 'wides':
        return trend.wides;
      case 'puckoutWinRate':
        return trend.puckoutWinRate * 100;
      default:
        return 0;
    }
  };

  const maxValue = Math.max(...data.trends.map(getMetricValue));
  const minValue = Math.min(...data.trends.map(getMetricValue));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Season Dashboard',
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity onPress={handleExportSeasonCSV}>
              <IconSymbol
                ios_icon_name="square.and.arrow.up"
                android_material_icon_name="file-download"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Season overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Season Overview</Text>
          <View style={styles.overviewStats}>
            <OverviewStat
              label="Matches"
              value={data.seasonStats.totalMatches}
              icon="sports"
            />
            <OverviewStat
              label="Wins"
              value={data.seasonStats.wins}
              icon="check-circle"
              color={colors.success}
            />
            <OverviewStat
              label="Losses"
              value={data.seasonStats.losses}
              icon="cancel"
              color={colors.danger}
            />
            <OverviewStat
              label="Draws"
              value={data.seasonStats.draws}
              icon="remove-circle"
              color={colors.warning}
            />
          </View>
          <View style={styles.overviewStats}>
            <OverviewStat
              label="Avg Points"
              value={data.seasonStats.averagePoints.toFixed(1)}
              icon="flag"
            />
            <OverviewStat
              label="Avg Goals"
              value={data.seasonStats.averageGoals.toFixed(1)}
              icon="sports-soccer"
            />
            <OverviewStat
              label="Avg Wides"
              value={data.seasonStats.averageWides.toFixed(1)}
              icon="close"
            />
            <OverviewStat
              label="Puckout %"
              value={`${(data.seasonStats.averagePuckoutWinRate * 100).toFixed(0)}%`}
              icon="trending-up"
            />
          </View>
        </View>

        {/* Trends chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Trends</Text>
          
          {/* Metric selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricSelector}>
            {(['points', 'goals', 'wides', 'puckoutWinRate'] as const).map((metric) => (
              <TouchableOpacity
                key={metric}
                style={[
                  styles.metricButton,
                  selectedMetric === metric && styles.metricButtonActive,
                ]}
                onPress={() => {
                  console.log('[SeasonDashboard] User selected metric:', metric);
                  setSelectedMetric(metric);
                }}
              >
                <Text
                  style={[
                    styles.metricButtonText,
                    selectedMetric === metric && styles.metricButtonTextActive,
                  ]}
                >
                  {metric === 'puckoutWinRate' ? 'Puckout %' : metric.charAt(0).toUpperCase() + metric.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Simple line chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chart}>
              {data.trends.map((trend, index) => {
                const value = getMetricValue(trend);
                const height = ((value - minValue) / (maxValue - minValue || 1)) * 150;
                return (
                  <TouchableOpacity
                    key={trend.fixtureId}
                    style={styles.chartBar}
                    onPress={() => {
                      console.log('[SeasonDashboard] User tapped match:', trend.opponent);
                      router.push(`/match-report/${trend.fixtureId}` as any);
                    }}
                  >
                    <View style={styles.chartBarContainer}>
                      <View
                        style={[
                          styles.chartBarFill,
                          {
                            height: Math.max(height, 10),
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartLabel} numberOfLines={1}>
                      {trend.opponent.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* League vs Championship */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>League vs Championship</Text>
          <View style={styles.comparisonContainer}>
            <ComparisonCard
              title="League"
              matches={data.leagueVsChampionship.league.matches}
              avgPoints={data.leagueVsChampionship.league.avgPoints}
              avgGoals={data.leagueVsChampionship.league.avgGoals}
              winRate={data.leagueVsChampionship.league.winRate}
              color="#4CAF50"
            />
            <ComparisonCard
              title="Championship"
              matches={data.leagueVsChampionship.championship.matches}
              avgPoints={data.leagueVsChampionship.championship.avgPoints}
              avgGoals={data.leagueVsChampionship.championship.avgGoals}
              winRate={data.leagueVsChampionship.championship.winRate}
              color="#FF9800"
            />
          </View>
        </View>

        {/* Match list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Matches</Text>
          {data.trends.slice().reverse().map((trend) => (
            <TouchableOpacity
              key={trend.fixtureId}
              style={styles.matchCard}
              onPress={() => {
                console.log('[SeasonDashboard] User tapped match:', trend.opponent);
                router.push(`/match-report/${trend.fixtureId}` as any);
              }}
            >
              <View style={styles.matchHeader}>
                <Text style={styles.matchOpponent}>{trend.opponent}</Text>
                <Text style={styles.matchDate}>
                  {new Date(trend.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.matchStats}>
                <MatchStat label="Goals" value={trend.goals} />
                <MatchStat label="Points" value={trend.points} />
                <MatchStat label="Wides" value={trend.wides} />
                <MatchStat
                  label="Conversion"
                  value={`${(trend.conversionRate * 100).toFixed(0)}%`}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OverviewStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}) {
  return (
    <View style={styles.overviewStat}>
      <IconSymbol
        ios_icon_name={icon}
        android_material_icon_name={icon}
        size={24}
        color={color || colors.primary}
      />
      <Text style={styles.overviewStatValue}>{value}</Text>
      <Text style={styles.overviewStatLabel}>{label}</Text>
    </View>
  );
}

function ComparisonCard({
  title,
  matches,
  avgPoints,
  avgGoals,
  winRate,
  color,
}: {
  title: string;
  matches: number;
  avgPoints: number;
  avgGoals: number;
  winRate: number;
  color: string;
}) {
  return (
    <View style={[styles.comparisonCard, { borderTopColor: color }]}>
      <Text style={[styles.comparisonTitle, { color }]}>{title}</Text>
      <Text style={styles.comparisonMatches}>{matches} matches</Text>
      <View style={styles.comparisonStats}>
        <View style={styles.comparisonStat}>
          <Text style={styles.comparisonStatValue}>{avgGoals.toFixed(1)}</Text>
          <Text style={styles.comparisonStatLabel}>Avg Goals</Text>
        </View>
        <View style={styles.comparisonStat}>
          <Text style={styles.comparisonStatValue}>{avgPoints.toFixed(1)}</Text>
          <Text style={styles.comparisonStatLabel}>Avg Points</Text>
        </View>
        <View style={styles.comparisonStat}>
          <Text style={styles.comparisonStatValue}>{(winRate * 100).toFixed(0)}%</Text>
          <Text style={styles.comparisonStatLabel}>Win Rate</Text>
        </View>
      </View>
    </View>
  );
}

function MatchStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.matchStat}>
      <Text style={styles.matchStatValue}>{value}</Text>
      <Text style={styles.matchStatLabel}>{label}</Text>
    </View>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  overviewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  overviewStat: {
    alignItems: 'center',
    gap: 4,
  },
  overviewStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  overviewStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  metricSelector: {
    marginBottom: 16,
    maxHeight: 50,
  },
  metricButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  metricButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  metricButtonTextActive: {
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    gap: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBarContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 150,
  },
  chartBarFill: {
    width: '80%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  comparisonMatches: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  comparisonStats: {
    gap: 8,
  },
  comparisonStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  comparisonStatLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  matchCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchOpponent: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  matchDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  matchStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  matchStat: {
    alignItems: 'center',
  },
  matchStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  matchStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
