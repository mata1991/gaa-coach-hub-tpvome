
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';

interface BenchmarkData {
  fixture: {
    goals: number;
    points: number;
    wides: number;
    puckoutWinRate: number;
    conversionRate: number;
    turnoverDiff: number;
  };
  seasonAverage: {
    goals: number;
    points: number;
    wides: number;
    puckoutWinRate: number;
    conversionRate: number;
    turnoverDiff: number;
  };
  differences: {
    goals: number;
    points: number;
    wides: number;
    puckoutWinRate: number;
    conversionRate: number;
    turnoverDiff: number;
  };
  notableChanges: Array<{
    metric: string;
    change: number;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }>;
}

export default function BenchmarksScreen() {
  const params = useLocalSearchParams();
  const fixtureId = params.fixtureId as string;

  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBenchmarks();
  }, [fixtureId]);

  const fetchBenchmarks = async () => {
    try {
      console.log('[Benchmarks] Fetching benchmarks for fixture:', fixtureId);
      setLoading(true);
      const result = await authenticatedGet<BenchmarkData>(
        `/api/fixtures/${fixtureId}/benchmarks`
      );
      console.log('[Benchmarks] Fetched benchmarks:', result);
      setData(result);
    } catch (error) {
      console.error('[Benchmarks] Error fetching benchmarks:', error);
      Alert.alert('Error', 'Failed to load benchmarks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Benchmarks',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading benchmarks...</Text>
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
            title: 'Benchmarks',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No benchmark data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return colors.danger;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Benchmarks',
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Notable changes */}
        {data.notableChanges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notable Changes</Text>
            {data.notableChanges.map((change, index) => (
              <View
                key={index}
                style={[
                  styles.changeCard,
                  { borderLeftColor: getSeverityColor(change.severity) },
                ]}
              >
                <View style={styles.changeHeader}>
                  <IconSymbol
                    ios_icon_name={getSeverityIcon(change.severity)}
                    android_material_icon_name={getSeverityIcon(change.severity)}
                    size={24}
                    color={getSeverityColor(change.severity)}
                  />
                  <Text style={styles.changeMetric}>{change.metric}</Text>
                  <Text
                    style={[
                      styles.changeValue,
                      { color: getSeverityColor(change.severity) },
                    ]}
                  >
                    {change.change > 0 ? '+' : ''}
                    {change.change.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.changeMessage}>{change.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Comparison table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match vs Season Average</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tableMetricCell]}>Metric</Text>
              <Text style={styles.tableHeaderCell}>Match</Text>
              <Text style={styles.tableHeaderCell}>Average</Text>
              <Text style={styles.tableHeaderCell}>Diff</Text>
            </View>

            <ComparisonRow
              metric="Goals"
              matchValue={data.fixture.goals}
              avgValue={data.seasonAverage.goals}
              diff={data.differences.goals}
            />
            <ComparisonRow
              metric="Points"
              matchValue={data.fixture.points}
              avgValue={data.seasonAverage.points}
              diff={data.differences.points}
            />
            <ComparisonRow
              metric="Wides"
              matchValue={data.fixture.wides}
              avgValue={data.seasonAverage.wides}
              diff={data.differences.wides}
              inverse
            />
            <ComparisonRow
              metric="Puckout Win %"
              matchValue={`${(data.fixture.puckoutWinRate * 100).toFixed(1)}%`}
              avgValue={`${(data.seasonAverage.puckoutWinRate * 100).toFixed(1)}%`}
              diff={`${(data.differences.puckoutWinRate * 100).toFixed(1)}%`}
              diffValue={data.differences.puckoutWinRate}
            />
            <ComparisonRow
              metric="Conversion %"
              matchValue={`${(data.fixture.conversionRate * 100).toFixed(1)}%`}
              avgValue={`${(data.seasonAverage.conversionRate * 100).toFixed(1)}%`}
              diff={`${(data.differences.conversionRate * 100).toFixed(1)}%`}
              diffValue={data.differences.conversionRate}
            />
            <ComparisonRow
              metric="Turnover Diff"
              matchValue={data.fixture.turnoverDiff}
              avgValue={data.seasonAverage.turnoverDiff}
              diff={data.differences.turnoverDiff}
            />
          </View>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightCard}>
            <IconSymbol
              ios_icon_name="lightbulb.fill"
              android_material_icon_name="lightbulb"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.insightText}>
              Compare this match to your season average to identify strengths and areas for
              improvement. Notable changes are flagged based on significant deviations from your
              typical performance.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ComparisonRow({
  metric,
  matchValue,
  avgValue,
  diff,
  diffValue,
  inverse = false,
}: {
  metric: string;
  matchValue: string | number;
  avgValue: string | number;
  diff: string | number;
  diffValue?: number;
  inverse?: boolean;
}) {
  const numDiff = diffValue !== undefined ? diffValue : (typeof diff === 'number' ? diff : 0);
  const isPositive = inverse ? numDiff < 0 : numDiff > 0;
  const diffColor = numDiff === 0 ? colors.textSecondary : isPositive ? colors.success : colors.danger;

  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.tableMetricCell]}>{metric}</Text>
      <Text style={styles.tableCell}>{matchValue}</Text>
      <Text style={styles.tableCell}>{avgValue}</Text>
      <Text style={[styles.tableCell, { color: diffColor, fontWeight: '600' }]}>
        {typeof diff === 'number' && diff > 0 ? '+' : ''}
        {diff}
      </Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  changeCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  changeMetric: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  changeValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  changeMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 36,
  },
  table: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tableMetricCell: {
    flex: 1.5,
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
