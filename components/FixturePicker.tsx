
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { Fixture } from '@/types';

interface FixturePickerProps {
  visible: boolean;
  fixtures: Fixture[];
  onSelect: (fixture: Fixture) => void;
  onClose: () => void;
  title?: string;
}

export function FixturePicker({
  visible,
  fixtures,
  onSelect,
  onClose,
  title = 'Select Fixture',
}: FixturePickerProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {fixtures.map((fixture) => {
            const fixtureDate = new Date(fixture.date);
            const dateStr = fixtureDate.toLocaleDateString();
            const timeStr = fixtureDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <TouchableOpacity
                key={fixture.id}
                style={styles.fixtureCard}
                onPress={() => {
                  console.log('Fixture selected:', fixture.opponent);
                  onSelect(fixture);
                }}
              >
                <View style={styles.fixtureInfo}>
                  <View style={styles.opponentRow}>
                    <Text style={styles.opponent}>{fixture.opponent}</Text>
                    {fixture.status === 'draft' && (
                      <View style={styles.draftBadge}>
                        <Text style={styles.draftBadgeText}>DRAFT</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.fixtureDetails}>
                    <View style={styles.detailRow}>
                      <IconSymbol
                        ios_icon_name="calendar"
                        android_material_icon_name="event"
                        size={16}
                        color="#666"
                      />
                      <Text style={styles.detailText}>{dateStr}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <IconSymbol
                        ios_icon_name="clock"
                        android_material_icon_name="access-time"
                        size={16}
                        color="#666"
                      />
                      <Text style={styles.detailText}>{timeStr}</Text>
                    </View>
                    {fixture.venue && (
                      <View style={styles.detailRow}>
                        <IconSymbol
                          ios_icon_name="location"
                          android_material_icon_name="location-on"
                          size={16}
                          color="#666"
                        />
                        <Text style={styles.detailText}>{fixture.venue}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="arrow-forward"
                  size={20}
                  color="#000"
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  fixtureCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  fixtureInfo: {
    flex: 1,
    gap: 8,
  },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  opponent: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  draftBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fixtureDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
});
