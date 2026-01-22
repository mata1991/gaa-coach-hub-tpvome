
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';
import { MatchState, MatchEvent, TeamSide } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkState } from 'expo-network';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 32,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    width: 100,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  confirmButton: {
    minHeight: 60,
    backgroundColor: '#FF0000',
    borderWidth: 2,
    borderColor: '#FF0000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default function EventConfirmScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const fixtureId = params.fixtureId as string;
  const eventType = params.eventType as string;
  const eventCategory = params.eventCategory as string;
  const side = params.side as TeamSide;
  const playerId = params.playerId as string;
  const playerName = params.playerName as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matchState, setMatchState] = useState<MatchState | null>(null);

  const networkState = useNetworkState();

  useEffect(() => {
    fetchData();
  }, [fixtureId]);

  const fetchData = async () => {
    console.log('[EventConfirm] Fetching match state');
    try {
      setLoading(true);
      const stateResponse = await authenticatedGet(`/api/fixtures/${fixtureId}/match-state`);
      setMatchState(stateResponse);
    } catch (error) {
      console.error('[EventConfirm] Error fetching match state:', error);
      Alert.alert('Error', 'Failed to load match state');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!matchState) return;

    console.log('[EventConfirm] User confirmed event:', eventType);
    setSaving(true);

    try {
      const currentHalf = (matchState as any).half || 'H1';

      const event: MatchEvent = {
        fixtureId,
        playerId: playerId || undefined as any,
        side,
        timestamp: matchState.matchClock,
        eventType,
        eventCategory: eventCategory as any,
        half: currentHalf,
        clientId: `${Date.now()}_${Math.random()}`,
        synced: false,
      };

      const stored = await AsyncStorage.getItem(`pending_events_${fixtureId}`);
      const pendingEvents = stored ? JSON.parse(stored) : [];
      pendingEvents.push(event);
      await AsyncStorage.setItem(`pending_events_${fixtureId}`, JSON.stringify(pendingEvents));

      if (eventType === 'Goal') {
        const goalsKey = side === 'HOME' ? 'homeGoals' : 'awayGoals';
        const newGoals = matchState[goalsKey] + 1;
        await authenticatedPut(`/api/fixtures/${fixtureId}/match-state`, { [goalsKey]: newGoals });
      } else if (eventType === 'Point') {
        const pointsKey = side === 'HOME' ? 'homePoints' : 'awayPoints';
        const newPoints = matchState[pointsKey] + 1;
        await authenticatedPut(`/api/fixtures/${fixtureId}/match-state`, { [pointsKey]: newPoints });
      }

      if (networkState.isConnected) {
        try {
          await authenticatedPost('/api/match-events/batch', { events: [event] });
          await AsyncStorage.removeItem(`pending_events_${fixtureId}`);
        } catch (error) {
          console.error('[EventConfirm] Error syncing event:', error);
        }
      }

      const displayPlayer = playerName === 'Skipped' ? 'Skipped' : playerName;
      const toastMessage = `Recorded: ${side} ${eventType} (${displayPlayer})`;
      
      Alert.alert('Event Recorded', toastMessage, [
        {
          text: 'OK',
          onPress: () => {
            router.back();
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('[EventConfirm] Error saving event:', error);
      Alert.alert('Error', 'Failed to save event');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Confirm Event', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const displayPlayer = playerName === 'Skipped' ? 'Skipped' : playerName;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Confirm Event', headerShown: true }} />

      <View style={styles.content}>
        <Text style={styles.title}>Confirm Event</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Event:</Text>
            <Text style={styles.summaryValue}>{eventType}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Team:</Text>
            <Text style={styles.summaryValue}>{side}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Player:</Text>
            <Text style={styles.summaryValue}>{displayPlayer}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm & Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
