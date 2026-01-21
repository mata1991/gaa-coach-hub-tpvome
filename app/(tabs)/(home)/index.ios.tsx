
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useRouter, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, BACKEND_URL } from '@/utils/api';
import { Fixture, Team, Club } from '@/types';

const LAST_SELECTED_TEAM_KEY = '@gaa_coach_hub:last_selected_team';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingTeams, setCheckingTeams] = useState(true);

  console.log('[Home iOS] Rendering home screen', { user: user?.id, loading });

  // Check for teams and redirect if needed
  useEffect(() => {
    const checkTeamsAndRedirect = async () => {
      if (!user || loading) {
        console.log('[Home iOS] Waiting for auth...');
        return;
      }

      console.log('[Home iOS] Checking teams for post-login redirect');
      setCheckingTeams(true);

      try {
        // Fetch user's clubs
        const clubsData = await authenticatedGet<Club[]>('/api/clubs');
        console.log('[Home iOS] Fetched clubs:', clubsData);

        if (!clubsData || clubsData.length === 0) {
          console.log('[Home iOS] No clubs found, redirecting to get-started');
          router.replace('/get-started');
          return;
        }

        // Fetch teams for all clubs
        const allTeams: Team[] = [];
        for (const club of clubsData) {
          try {
            const clubTeams = await authenticatedGet<Team[]>(`/api/teams?clubId=${club.id}`);
            allTeams.push(...clubTeams);
          } catch (error) {
            console.error(`[Home iOS] Failed to fetch teams for club ${club.id}:`, error);
          }
        }

        console.log('[Home iOS] Total teams found:', allTeams.length);

        if (allTeams.length === 0) {
          console.log('[Home iOS] No teams found, redirecting to create team');
          router.replace({
            pathname: '/create-team',
            params: { clubId: clubsData[0].id },
          });
          return;
        }

        // Check for last selected team
        const lastTeamId = await AsyncStorage.getItem(LAST_SELECTED_TEAM_KEY);
        console.log('[Home iOS] Last selected team ID:', lastTeamId);

        if (lastTeamId && allTeams.find((t) => t.id === lastTeamId)) {
          console.log('[Home iOS] Auto-loading last selected team');
          router.replace({
            pathname: '/team-dashboard/[teamId]',
            params: { teamId: lastTeamId },
          });
          return;
        }

        // Multiple teams, show selection screen
        console.log('[Home iOS] Multiple teams found, redirecting to select team');
        router.replace('/select-team');
      } catch (error) {
        console.error('[Home iOS] Error checking teams:', error);
        setError('Failed to load teams. Please try again.');
      } finally {
        setCheckingTeams(false);
      }
    };

    checkTeamsAndRedirect();
  }, [user, loading, router]);

  // Redirect to auth if not logged in
  if (!loading && !user) {
    return <Redirect href="/auth" />;
  }

  // Show loading while checking teams
  if (loading || checkingTeams) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="error"
            size={64}
            color={colors.danger}
          />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              console.log('[Home iOS] User tapped Retry button');
              setError(null);
              setCheckingTeams(true);
            }}
          >
            <IconSymbol
              ios_icon_name="arrow.clockwise"
              android_material_icon_name="refresh"
              size={20}
              color="#fff"
            />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // This screen should not be reached if teams exist
  // User will be redirected to team dashboard or select team
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Redirecting...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
