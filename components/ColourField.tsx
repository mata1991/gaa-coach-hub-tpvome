
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

const SWATCHES = [
  '#000000', '#FFFFFF', '#FF0000', '#1E3A8A', '#0B1F5B', '#38BDF8',
  '#0F7A3A', '#FBBF24', '#800000', '#FFBF00', '#F59E0B', '#6B7280',
  '#DC143C', '#0047AB', '#FFD700', '#32CD32', '#800080', '#FF8C00',
];

interface ColourFieldProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  allowNone?: boolean;
}

export function ColourField({ label, value, onChange, allowNone }: ColourFieldProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const displayValue = value || 'None';
  const swatchColor = value || '#FFFFFF';

  return (
    <>
      <Pressable
        style={styles.fieldContainer}
        onPress={() => setModalOpen(true)}
      >
        <View style={styles.fieldRow}>
          <View style={[styles.swatch, { backgroundColor: swatchColor }]} />
          <View style={styles.fieldInfo}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue}>{displayValue}</Text>
          </View>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={colors.textSecondary}
          />
        </View>
      </Pressable>

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Colour</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="close"
                  size={28}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.swatchGrid}>
              {allowNone && (
                <Pressable
                  style={styles.noneButton}
                  onPress={() => {
                    onChange('');
                    setModalOpen(false);
                  }}
                >
                  <Text style={styles.noneButtonText}>None</Text>
                </Pressable>
              )}
              {SWATCHES.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.swatchButton,
                    { backgroundColor: color },
                    value === color && styles.swatchButtonSelected,
                  ]}
                  onPress={() => {
                    onChange(color);
                    setModalOpen(false);
                  }}
                >
                  {value === color && (
                    <IconSymbol
                      ios_icon_name="checkmark"
                      android_material_icon_name="check"
                      size={24}
                      color={color === '#FFFFFF' ? '#000000' : '#FFFFFF'}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldInfo: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  fieldValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  noneButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noneButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  swatchButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchButtonSelected: {
    borderWidth: 3,
    borderColor: colors.text,
  },
});
