
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkState } from 'expo-network';
import { MatchEvent } from '@/types';

const OFFLINE_QUEUE_KEY = 'match_events_offline_queue';

export function useOfflineSync() {
  const [queuedEvents, setQueuedEvents] = useState<MatchEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const networkState = useNetworkState();

  // Load queued events from storage
  useEffect(() => {
    loadQueuedEvents();
  }, []);

  const loadQueuedEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        const events = JSON.parse(stored);
        setQueuedEvents(events);
        console.log('Loaded queued events from storage:', events.length);
      }
    } catch (error) {
      console.error('Error loading queued events:', error);
    }
  };

  const addToQueue = async (event: MatchEvent) => {
    try {
      const newQueue = [...queuedEvents, event];
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
      setQueuedEvents(newQueue);
      console.log('Added event to offline queue:', event.eventType);
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  };

  const syncQueue = useCallback(async () => {
    if (queuedEvents.length === 0 || isSyncing || !networkState.isConnected) {
      return;
    }

    console.log('Starting sync of', queuedEvents.length, 'events');
    setIsSyncing(true);

    try {
      // Group events by fixtureId
      const eventsByFixture = queuedEvents.reduce((acc, event) => {
        if (!acc[event.fixtureId]) {
          acc[event.fixtureId] = [];
        }
        acc[event.fixtureId].push(event);
        return acc;
      }, {} as Record<string, MatchEvent[]>);

      // Sync each fixture's events
      const { authenticatedPost } = await import('@/utils/api');
      
      for (const [fixtureId, events] of Object.entries(eventsByFixture)) {
        console.log(`Syncing ${events.length} events for fixture ${fixtureId}`);
        
        await authenticatedPost('/api/match-events/batch', {
          fixtureId,
          events: events.map(e => ({
            playerId: e.playerId,
            timestamp: e.timestamp,
            eventType: e.eventType,
            eventCategory: e.eventCategory,
            outcome: e.outcome,
            zone: e.zone,
            notes: e.notes,
            clientId: e.clientId,
          })),
        });
      }
      
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      setQueuedEvents([]);
      console.log('Successfully synced all events');
    } catch (error) {
      console.error('Error syncing queue:', error);
      // Keep events in queue if sync fails
    } finally {
      setIsSyncing(false);
    }
  }, [queuedEvents, isSyncing, networkState.isConnected]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (networkState.isConnected && queuedEvents.length > 0 && !isSyncing) {
      console.log('Network connected, auto-syncing queued events');
      syncQueue();
    }
  }, [networkState.isConnected, queuedEvents.length, isSyncing, syncQueue]);

  return {
    queuedEvents,
    addToQueue,
    syncQueue,
    isSyncing,
    hasQueuedEvents: queuedEvents.length > 0,
  };
}
