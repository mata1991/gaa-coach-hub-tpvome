
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost } from '@/utils/api';

interface MatchReport {
  fixture: {
    id: string;
    opponent: string;
    venue: string;
    date: string;
    competition: string;
  };
  teamStats: {
    totalPoints: number;
    totalGoals: number;
    totalWides: number;
    conversionRate: number;
    scoringEfficiency: number;
    puckoutWinPercentage: number;
    puckoutDirectionBreakdown: {
      left: number;
      centre: number;
      right: number;
      short: number;
      long: number;
    };
    turnoverDifferential: number;
    freesFor: number;
    freesAgainst: number;
    freeConversionRate: number;
  };
  playerStats: Array<{
    playerId: string;
    playerName: string;
    jerseyNo: number;
    contributions: {
      goals: number;
      points: number;
      wides: number;
      assists: number;
      turnoversWon: number;
      turnoversLost: number;
      puckoutsWon: number;
      puckoutsLost: number;
      freesWon: number;
      freesConceded: number;
    };
    efficiency: number;
    discipline: {
      yellowCards: number;
      redCards: number;
    };
  }>;
  quarterBreakdown: Array<{
    quarter: number;
    stats: {
      goals: number;
      points: number;
      wides: number;
      turnovers: number;
      puckouts: number;
    };
  }>;
  heatmaps: {
    shots: Array<{ zone: string; count: number; successful: number }>;
    puckouts: Array<{ zone: string; count: number; won: number }>;
  };
}

export default function MatchReportScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const fixtureId = params.fixtureId as string;

  const [report, setReport] = useState<MatchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'players' | 'quarters' | 'heatmaps'>('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [fixtureId]);

  const fetchReport = async () => {
    try {
      console.log('[MatchReport] Fetching report for fixture:', fixtureId);
      setLoading(true);
      const data = await authenticatedGet<MatchReport>(`/api/fixtures/${fixtureId}/report`);
      console.log('[MatchReport] Fetched report:', data);
      setReport(data);
    } catch (error) {
      console.error('[MatchReport] Error fetching report:', error);
      Alert.alert('Error', 'Failed to load match report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportWhatsApp = async () => {
    try {
      console.log('[MatchReport] User tapped WhatsApp export');
      setExporting(true);
      const result = await authenticatedPost<{ shareText: string; summary: string }>(
        `/api/fixtures/${fixtureId}/export/whatsapp`,
        { includePlayerStats: true }
      );
      
      if (result?.shareText) {
        await Share.share({
          message: result.shareText,
        });
      }
    } catch (error) {
      console.error('[MatchReport] Error exporting to WhatsApp:', error);
      Alert.alert('Error', 'Failed to generate WhatsApp share');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      console.log('[MatchReport] User tapped PDF export');
      setExporting(true);
      const result = await authenticatedPost<{ pdfUrl: string; filename: string }>(
        `/api/fixtures/${fixtureId}/export/pdf`,
        { includeHeatmaps: true, includePlayerStats: true }
      );
      
      if (result?.pdfUrl) {
        Alert.alert('PDF Generated', `PDF available at: ${result.filename}`, [
          { text: 'OK' }
        ]);
      }
    } catch (error) {
      console.error('[MatchReport] Error exporting PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      console.log('[MatchReport] User tapped CSV export');
      setExporting(true);
      
      // Fetch CSV data from backend
      const { BACKEND_URL, getBearerToken } = await import('@/utils/api');
      const token = await getBearerToken();
      
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }
      
      const url = `${BACKEND_URL}/api/fixtures/${fixtureId}/export/csv`;
      console.log('[MatchReport] Fetching CSV from:', url);
      
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
      console.log('[MatchReport] CSV data received, length:', csvText.length);
      
      if (Platform.OS === 'web') {
        // Web: Download as file
        const blob = new Blob([csvText], { type: 'text/csv' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `match-${fixtureId}-events.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        Alert.alert('Success', 'CSV file downloaded');
      } else {
        // Native: Share via share sheet
        const { Share } = await import('react-native');
        await Share.share({
          message: csvText,
          title: `Match Events - ${report?.fixture.opponent || 'Match'}`,
        });
      }
    } catch (error) {
      console.error('[MatchReport] Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Match Report',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading match report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Match Report',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No report data available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReport}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Match Report',
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push(`/match-report/${fixtureId}/benchmarks` as any)}>
              <IconSymbol
                ios_icon_name="chart.bar"
                android_material_icon_name="bar-chart"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Match header */}
      <View style={styles.header}>
        <Text style={styles.opponent}>{report.fixture.opponent}</Text>
        <Text style={styles.venue}>{report.fixture.venue}</Text>
        <Text style={styles.date}>{new Date(report.fixture.date).toLocaleDateString()}</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>
            {report.teamStats.totalGoals}-{report.teamStats.totalPoints}
          </Text>
          <Text style={styles.scoreLabel}>
            ({report.teamStats.totalGoals * 3 + report.teamStats.totalPoints} points)
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {(['overview', 'players', 'quarters', 'heatmaps'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.tabActive]}
            onPress={() => {
              console.log('[MatchReport] User selected tab:', tab);
              setSelectedTab(tab);
            }}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {selectedTab === 'overview' && (
          <View>
            <StatCard title="Scoring">
              <StatRow label="Goals" value={report.teamStats.totalGoals} />
              <StatRow label="Points" value={report.teamStats.totalPoints} />
              <StatRow label="Wides" value={report.teamStats.totalWides} />
              <StatRow
                label="Conversion Rate"
                value={`${(report.teamStats.conversionRate * 100).toFixed(1)}%`}
              />
              <StatRow
                label="Scoring Efficiency"
                value={report.teamStats.scoringEfficiency.toFixed(2)}
              />
            </StatCard>

            <StatCard title="Puckouts">
              <StatRow
                label="Win Percentage"
                value={`${(report.teamStats.puckoutWinPercentage * 100).toFixed(1)}%`}
              />
              <StatRow
                label="Left"
                value={report.teamStats.puckoutDirectionBreakdown.left}
              />
              <StatRow
                label="Centre"
                value={report.teamStats.puckoutDirectionBreakdown.centre}
              />
              <StatRow
                label="Right"
                value={report.teamStats.puckoutDirectionBreakdown.right}
              />
              <StatRow
                label="Short"
                value={report.teamStats.puckoutDirectionBreakdown.short}
              />
              <StatRow
                label="Long"
                value={report.teamStats.puckoutDirectionBreakdown.long}
              />
            </StatCard>

            <StatCard title="Possession & Discipline">
              <StatRow
                label="Turnover Differential"
                value={report.teamStats.turnoverDifferential}
                highlight={report.teamStats.turnoverDifferential > 0}
              />
              <StatRow label="Frees For" value={report.teamStats.freesFor} />
              <StatRow label="Frees Against" value={report.teamStats.freesAgainst} />
              <StatRow
                label="Free Conversion"
                value={`${(report.teamStats.freeConversionRate * 100).toFixed(1)}%`}
              />
            </StatCard>
          </View>
        )}

        {selectedTab === 'players' && (
          <View>
            {report.playerStats.map((player) => (
              <View key={player.playerId} style={styles.playerCard}>
                <View style={styles.playerHeader}>
                  <Text style={styles.playerNumber}>#{player.jerseyNo}</Text>
                  <Text style={styles.playerName}>{player.playerName}</Text>
                  <Text style={styles.playerEfficiency}>
                    {(player.efficiency * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.playerStats}>
                  <PlayerStat
                    label="Goals"
                    value={player.contributions.goals}
                    icon="sports-soccer"
                  />
                  <PlayerStat
                    label="Points"
                    value={player.contributions.points}
                    icon="flag"
                  />
                  <PlayerStat
                    label="Wides"
                    value={player.contributions.wides}
                    icon="close"
                  />
                  <PlayerStat
                    label="Turnovers +"
                    value={player.contributions.turnoversWon}
                    icon="trending-up"
                  />
                  <PlayerStat
                    label="Turnovers -"
                    value={player.contributions.turnoversLost}
                    icon="trending-down"
                  />
                  <PlayerStat
                    label="Frees Won"
                    value={player.contributions.freesWon}
                    icon="add-circle"
                  />
                </View>
                {(player.discipline.yellowCards > 0 || player.discipline.redCards > 0) && (
                  <View style={styles.disciplineRow}>
                    {player.discipline.yellowCards > 0 && (
                      <View style={styles.card}>
                        <View style={[styles.cardIcon, { backgroundColor: '#FFC107' }]} />
                        <Text style={styles.cardText}>{player.discipline.yellowCards}</Text>
                      </View>
                    )}
                    {player.discipline.redCards > 0 && (
                      <View style={styles.card}>
                        <View style={[styles.cardIcon, { backgroundColor: '#F44336' }]} />
                        <Text style={styles.cardText}>{player.discipline.redCards}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {selectedTab === 'quarters' && (
          <View>
            {report.quarterBreakdown.map((quarter) => (
              <StatCard key={quarter.quarter} title={`Quarter ${quarter.quarter}`}>
                <StatRow label="Goals" value={quarter.stats.goals} />
                <StatRow label="Points" value={quarter.stats.points} />
                <StatRow label="Wides" value={quarter.stats.wides} />
                <StatRow label="Turnovers" value={quarter.stats.turnovers} />
                <StatRow label="Puckouts" value={quarter.stats.puckouts} />
              </StatCard>
            ))}
          </View>
        )}

        {selectedTab === 'heatmaps' && (
          <View>
            <StatCard title="Shot Heatmap">
              {report.heatmaps.shots.map((zone) => (
                <View key={zone.zone} style={styles.heatmapRow}>
                  <Text style={styles.heatmapZone}>{zone.zone}</Text>
                  <View style={styles.heatmapBar}>
                    <View
                      style={[
                        styles.heatmapBarFill,
                        {
                          width: `${(zone.successful / zone.count) * 100}%`,
                          backgroundColor: colors.success,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.heatmapBarFill,
                        {
                          width: `${((zone.count - zone.successful) / zone.count) * 100}%`,
                          backgroundColor: colors.danger,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.heatmapCount}>
                    {zone.successful}/{zone.count}
                  </Text>
                </View>
              ))}
            </StatCard>

            <StatCard title="Puckout Heatmap">
              {report.heatmaps.puckouts.map((zone) => (
                <View key={zone.zone} style={styles.heatmapRow}>
                  <Text style={styles.heatmapZone}>{zone.zone}</Text>
                  <View style={styles.heatmapBar}>
                    <View
                      style={[
                        styles.heatmapBarFill,
                        {
                          width: `${(zone.won / zone.count) * 100}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.heatmapCount}>
                    {zone.won}/{zone.count}
                  </Text>
                </View>
              ))}
            </StatCard>
          </View>
        )}
      </ScrollView>

      {/* Export buttons */}
      <View style={styles.exportContainer}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportWhatsApp}
          disabled={exporting}
        >
          <IconSymbol
            ios_icon_name="message.fill"
            android_material_icon_name="message"
            size={20}
            color="#fff"
          />
          <Text style={styles.exportButtonText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportPDF}
          disabled={exporting}
        >
          <IconSymbol
            ios_icon_name="doc.fill"
            android_material_icon_name="description"
            size={20}
            color="#fff"
          />
          <Text style={styles.exportButtonText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportCSV}
          disabled={exporting}
        >
          <IconSymbol
            ios_icon_name="tablecells"
            android_material_icon_name="table-chart"
            size={20}
            color="#fff"
          />
          <Text style={styles.exportButtonText}>CSV</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );
}

function PlayerStat({ label, value, icon }: { label: string; value: number; icon: string }) {
  if (value === 0) return null;
  return (
    <View style={styles.playerStat}>
      <IconSymbol
        ios_icon_name={icon}
        android_material_icon_name={icon}
        size={16}
        color={colors.textSecondary}
      />
      <Text style={styles.playerStatLabel}>{label}</Text>
      <Text style={styles.playerStatValue}>{value}</Text>
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
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    alignItems: 'center',
  },
  opponent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  venue: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  date: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  scoreContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  tabs: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 50,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: 16,
    color: colors.text,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statValueHighlight: {
    color: colors.success,
  },
  playerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  playerNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  playerName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  playerEfficiency: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  playerStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  playerStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  playerStatValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  disciplineRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardIcon: {
    width: 16,
    height: 20,
    borderRadius: 2,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  heatmapZone: {
    fontSize: 14,
    color: colors.text,
    minWidth: 80,
  },
  heatmapBar: {
    flex: 1,
    height: 24,
    backgroundColor: colors.background,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  heatmapBarFill: {
    height: '100%',
  },
  heatmapCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    minWidth: 50,
    textAlign: 'right',
  },
  exportContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'android' ? 16 : 32,
  },
  exportButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
