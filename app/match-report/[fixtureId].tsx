
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share,
  Modal,
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
  halfBreakdown: Array<{
    half: 'H1' | 'H2';
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

// Default report to prevent crashes when data is undefined
const DEFAULT_REPORT: MatchReport = {
  fixture: {
    id: '',
    opponent: 'Unknown',
    venue: 'Unknown',
    date: new Date().toISOString(),
    competition: 'Unknown',
  },
  teamStats: {
    totalPoints: 0,
    totalGoals: 0,
    totalWides: 0,
    conversionRate: 0,
    scoringEfficiency: 0,
    puckoutWinPercentage: 0,
    puckoutDirectionBreakdown: {
      left: 0,
      centre: 0,
      right: 0,
      short: 0,
      long: 0,
    },
    turnoverDifferential: 0,
    freesFor: 0,
    freesAgainst: 0,
    freeConversionRate: 0,
  },
  playerStats: [],
  halfBreakdown: [],
  heatmaps: {
    shots: [],
    puckouts: [],
  },
};

export default function MatchReportScreen() {
  const params = useLocalSearchParams<{ fixtureId?: string }>();
  const router = useRouter();
  const fixtureId = params.fixtureId;

  const [report, setReport] = useState<MatchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'players' | 'halves' | 'heatmaps'>('overview');
  const [exporting, setExporting] = useState(false);
  
  // Custom modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  console.log('[MatchReport] Rendering match report screen', { fixtureId });

  useEffect(() => {
    // Validate fixtureId before fetching
    if (!fixtureId) {
      console.error('[MatchReport] ERROR: fixtureId is missing from route params!');
      setError('No fixture selected');
      setLoading(false);
      return;
    }

    fetchReport();
  }, [fixtureId]);

  const fetchReport = async () => {
    if (!fixtureId) {
      console.error('[MatchReport] Cannot fetch report: fixtureId is undefined');
      setError('No fixture selected');
      setLoading(false);
      return;
    }

    try {
      console.log('[MatchReport] Fetching report for fixture:', fixtureId);
      setLoading(true);
      setError(null);
      const data = await authenticatedGet<MatchReport>(`/api/fixtures/${fixtureId}/report`);
      console.log('[MatchReport] Fetched report:', data);
      
      // Use safe defaults if data is missing
      const safeData = data || DEFAULT_REPORT;
      setReport(safeData);
    } catch (err: any) {
      console.error('[MatchReport] Error fetching report:', err);
      console.error('[MatchReport] Error message:', err?.message);
      console.error('[MatchReport] Error status:', err?.status);
      
      const errorMessage = err?.message || 'Failed to load match report';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    setErrorModalMessage(`${title}\n\n${message}`);
    setShowErrorModal(true);
  };

  const handleExportWhatsApp = async () => {
    if (!fixtureId) {
      showAlert('Error', 'Missing fixture ID');
      return;
    }
    
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
      showAlert('Error', 'Failed to generate WhatsApp share');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!fixtureId) {
      showAlert('Error', 'Missing fixture ID');
      return;
    }
    
    try {
      console.log('[MatchReport] User tapped PDF export');
      setExporting(true);
      const result = await authenticatedPost<{ pdfUrl: string; filename: string }>(
        `/api/fixtures/${fixtureId}/export/pdf`,
        { includeHeatmaps: true, includePlayerStats: true }
      );
      
      if (result?.pdfUrl) {
        showAlert('PDF Generated', `PDF available at: ${result.filename}`);
      }
    } catch (error) {
      console.error('[MatchReport] Error exporting PDF:', error);
      showAlert('Error', 'Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!fixtureId) {
      showAlert('Error', 'Missing fixture ID');
      return;
    }
    
    try {
      console.log('[MatchReport] User tapped CSV export');
      setExporting(true);
      
      // Fetch CSV data from backend
      const { BACKEND_URL, getBearerToken } = await import('@/utils/api');
      const token = await getBearerToken();
      
      if (!token) {
        showAlert('Error', 'Authentication required');
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
        showAlert('Success', 'CSV file downloaded');
      } else {
        // Native: Share via share sheet
        const { Share } = await import('react-native');
        await Share.share({
          message: csvText,
          title: `Match Events - ${safeReport?.fixture?.opponent ?? 'Match'}`,
        });
      }
    } catch (error) {
      console.error('[MatchReport] Error exporting CSV:', error);
      showAlert('Error', 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // Show error screen if fixtureId is missing
  if (!fixtureId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Match Report',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={64}
            color="#dc3545"
          />
          <Text style={styles.errorTitle}>No Fixture Selected</Text>
          <Text style={styles.errorText}>
            Please select a fixture to view the match report.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
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

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Match Report',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.circle"
            android_material_icon_name="error"
            size={64}
            color="#dc3545"
          />
          <Text style={styles.errorTitle}>Failed to Load Report</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={fetchReport}>
            <Text style={styles.errorButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No report data after successful load
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
          <IconSymbol
            ios_icon_name="doc.text"
            android_material_icon_name="description"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.loadingText}>No report data yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Match events will appear here once the match has started
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={fetchReport}>
            <Text style={styles.errorButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Format GAA score as goals-points (e.g., "1-01", "0-20")
  const formatScore = (goals: number, points: number): string => {
    const goalsStr = goals.toString();
    const pointsStr = points.toString().padStart(2, '0');
    return `${goalsStr}-${pointsStr}`;
  };

  // Use safe defaults to prevent crashes
  const safeReport = report ?? DEFAULT_REPORT;
  
  // Safe access with fallbacks
  const totalGoals = safeReport.teamStats?.totalGoals ?? 0;
  const totalPointsValue = safeReport.teamStats?.totalPoints ?? 0;
  const scoreDisplay = formatScore(totalGoals, totalPointsValue);
  const totalPoints = totalGoals * 3 + totalPointsValue;
  const totalPointsText = `${totalPoints} points`;
  
  const opponent = safeReport.fixture?.opponent ?? 'Unknown';
  const venue = safeReport.fixture?.venue ?? 'Unknown';
  const fixtureDate = safeReport.fixture?.date ?? new Date().toISOString();

  return (
    <>
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
          <Text style={styles.opponent}>{opponent}</Text>
          <Text style={styles.venue}>{venue}</Text>
          <Text style={styles.date}>{new Date(fixtureDate).toLocaleDateString()}</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.score}>{scoreDisplay}</Text>
            <Text style={styles.scoreLabel}>({totalPointsText})</Text>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {(['overview', 'players', 'halves', 'heatmaps'] as const).map((tab) => (
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
                <StatRow label="Goals" value={safeReport.teamStats?.totalGoals ?? 0} />
                <StatRow label="Points" value={safeReport.teamStats?.totalPoints ?? 0} />
                <StatRow label="Wides" value={safeReport.teamStats?.totalWides ?? 0} />
                <StatRow
                  label="Conversion Rate"
                  value={`${((safeReport.teamStats?.conversionRate ?? 0) * 100).toFixed(1)}%`}
                />
                <StatRow
                  label="Scoring Efficiency"
                  value={(safeReport.teamStats?.scoringEfficiency ?? 0).toFixed(2)}
                />
              </StatCard>

              <StatCard title="Puckouts">
                <StatRow
                  label="Win Percentage"
                  value={`${((safeReport.teamStats?.puckoutWinPercentage ?? 0) * 100).toFixed(1)}%`}
                />
                <StatRow
                  label="Left"
                  value={safeReport.teamStats?.puckoutDirectionBreakdown?.left ?? 0}
                />
                <StatRow
                  label="Centre"
                  value={safeReport.teamStats?.puckoutDirectionBreakdown?.centre ?? 0}
                />
                <StatRow
                  label="Right"
                  value={safeReport.teamStats?.puckoutDirectionBreakdown?.right ?? 0}
                />
                <StatRow
                  label="Short"
                  value={safeReport.teamStats?.puckoutDirectionBreakdown?.short ?? 0}
                />
                <StatRow
                  label="Long"
                  value={safeReport.teamStats?.puckoutDirectionBreakdown?.long ?? 0}
                />
              </StatCard>

              <StatCard title="Possession & Discipline">
                <StatRow
                  label="Turnover Differential"
                  value={safeReport.teamStats?.turnoverDifferential ?? 0}
                  highlight={(safeReport.teamStats?.turnoverDifferential ?? 0) > 0}
                />
                <StatRow label="Frees For" value={safeReport.teamStats?.freesFor ?? 0} />
                <StatRow label="Frees Against" value={safeReport.teamStats?.freesAgainst ?? 0} />
                <StatRow
                  label="Free Conversion"
                  value={`${((safeReport.teamStats?.freeConversionRate ?? 0) * 100).toFixed(1)}%`}
                />
              </StatCard>
            </View>
          )}

          {selectedTab === 'players' && (
            <View>
              {(safeReport.playerStats ?? []).length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No player stats yet</Text>
                </View>
              ) : (
                (safeReport.playerStats ?? []).map((player) => {
                  const jerseyNo = player?.jerseyNo ?? 0;
                  const playerName = player?.playerName ?? 'Unknown';
                  const efficiency = player?.efficiency ?? 0;
                  const contributions = player?.contributions ?? {};
                  const discipline = player?.discipline ?? {};
                  
                  return (
                    <View key={player.playerId} style={styles.playerCard}>
                      <View style={styles.playerHeader}>
                        <Text style={styles.playerNumber}>#{jerseyNo}</Text>
                        <Text style={styles.playerName}>{playerName}</Text>
                        <Text style={styles.playerEfficiency}>
                          {(efficiency * 100).toFixed(0)}%
                        </Text>
                      </View>
                      <View style={styles.playerStats}>
                        <PlayerStat
                          label="Goals"
                          value={contributions.goals ?? 0}
                          icon="sports-soccer"
                        />
                        <PlayerStat
                          label="Points"
                          value={contributions.points ?? 0}
                          icon="flag"
                        />
                        <PlayerStat
                          label="Wides"
                          value={contributions.wides ?? 0}
                          icon="close"
                        />
                        <PlayerStat
                          label="Turnovers +"
                          value={contributions.turnoversWon ?? 0}
                          icon="trending-up"
                        />
                        <PlayerStat
                          label="Turnovers -"
                          value={contributions.turnoversLost ?? 0}
                          icon="trending-down"
                        />
                        <PlayerStat
                          label="Frees Won"
                          value={contributions.freesWon ?? 0}
                          icon="add-circle"
                        />
                      </View>
                      {((discipline.yellowCards ?? 0) > 0 || (discipline.redCards ?? 0) > 0) && (
                        <View style={styles.disciplineRow}>
                          {(discipline.yellowCards ?? 0) > 0 && (
                            <View style={styles.card}>
                              <View style={[styles.cardIcon, { backgroundColor: '#FFC107' }]} />
                              <Text style={styles.cardText}>{discipline.yellowCards}</Text>
                            </View>
                          )}
                          {(discipline.redCards ?? 0) > 0 && (
                            <View style={styles.card}>
                              <View style={[styles.cardIcon, { backgroundColor: '#F44336' }]} />
                              <Text style={styles.cardText}>{discipline.redCards}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {selectedTab === 'halves' && (
            <View>
              {(safeReport.halfBreakdown ?? []).length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No half breakdown yet</Text>
                </View>
              ) : (
                (safeReport.halfBreakdown ?? []).map((half) => {
                  const halfTitle = half.half === 'H1' ? '1st Half' : '2nd Half';
                  const stats = half?.stats ?? {};
                  return (
                    <StatCard key={half.half} title={halfTitle}>
                      <StatRow label="Goals" value={stats.goals ?? 0} />
                      <StatRow label="Points" value={stats.points ?? 0} />
                      <StatRow label="Wides" value={stats.wides ?? 0} />
                      <StatRow label="Turnovers" value={stats.turnovers ?? 0} />
                      <StatRow label="Puckouts" value={stats.puckouts ?? 0} />
                    </StatCard>
                  );
                })
              )}
            </View>
          )}

          {selectedTab === 'heatmaps' && (
            <View>
              <StatCard title="Shot Heatmap">
                {(safeReport.heatmaps?.shots ?? []).length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No shot data yet</Text>
                  </View>
                ) : (
                  (safeReport.heatmaps?.shots ?? []).map((zone) => {
                    const zoneCount = zone?.count ?? 1;
                    const zoneSuccessful = zone?.successful ?? 0;
                    const successPercent = (zoneSuccessful / zoneCount) * 100;
                    const failPercent = ((zoneCount - zoneSuccessful) / zoneCount) * 100;
                    
                    return (
                      <View key={zone.zone} style={styles.heatmapRow}>
                        <Text style={styles.heatmapZone}>{zone.zone ?? 'Unknown'}</Text>
                        <View style={styles.heatmapBar}>
                          <View
                            style={[
                              styles.heatmapBarFill,
                              {
                                width: `${successPercent}%`,
                                backgroundColor: colors.success,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.heatmapBarFill,
                              {
                                width: `${failPercent}%`,
                                backgroundColor: colors.danger,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.heatmapCount}>
                          {zoneSuccessful}/{zoneCount}
                        </Text>
                      </View>
                    );
                  })
                )}
              </StatCard>

              <StatCard title="Puckout Heatmap">
                {(safeReport.heatmaps?.puckouts ?? []).length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No puckout data yet</Text>
                  </View>
                ) : (
                  (safeReport.heatmaps?.puckouts ?? []).map((zone) => {
                    const zoneCount = zone?.count ?? 1;
                    const zoneWon = zone?.won ?? 0;
                    const wonPercent = (zoneWon / zoneCount) * 100;
                    
                    return (
                      <View key={zone.zone} style={styles.heatmapRow}>
                        <Text style={styles.heatmapZone}>{zone.zone ?? 'Unknown'}</Text>
                        <View style={styles.heatmapBar}>
                          <View
                            style={[
                              styles.heatmapBarFill,
                              {
                                width: `${wonPercent}%`,
                                backgroundColor: colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.heatmapCount}>
                          {zoneWon}/{zoneCount}
                        </Text>
                      </View>
                    );
                  })
                )}
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

      {/* Custom Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalMessage}>{errorModalMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  modalMessage: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
