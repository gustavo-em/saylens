import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const architectureLayers = [
  'Domain',
  'Application',
  'Infrastructure',
  'Presentation',
] as const;

function AppContent() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>ANDROID FOUNDATION READY</Text>
        </View>

        <View style={styles.hero}>
          <Text accessibilityRole="header" style={styles.title}>
            SpellForMe
          </Text>
          <Text style={styles.subtitle}>Point. Discover. Pronounce.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>MILESTONE 1</Text>
          <Text style={styles.cardTitle}>The learning shell is running.</Text>
          <Text style={styles.cardBody}>
            Camera and on-device detection will enter through isolated adapters
            in the next milestones.
          </Text>

          <View style={styles.layers}>
            {architectureLayers.map(layer => (
              <View key={layer} style={styles.layerPill}>
                <Text style={styles.layerText}>{layer}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>React Native 0.87 · New Architecture</Text>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const colors = {
  background: '#07130F',
  card: '#10241C',
  cardBorder: '#275442',
  accent: '#70F1B5',
  text: '#F2FFF8',
  muted: '#9AB7AA',
} as const;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.cardBorder,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeDot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  hero: {
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  subtitle: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 24,
  },
  cardEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  cardBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  layers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
  },
  layerPill: {
    backgroundColor: '#173329',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  layerText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
});
