import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import * as pregnancyService from '../services/pregnancyService';
import ArticleCarousel, { DEFAULT_PREGNANCY_ARTICLES } from '../components/ArticleCarousel';
import AppBottomSheet from '../components/AppBottomSheet';

const WEEKS_IN_PREGNANCY = 40;
const RING_SIZE = 116;
const RING_RADIUS = 48;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatDueDate(dateValue) {
  if (!dateValue) return 'Not set';
  const parts = String(dateValue).split('T')[0].split('-').map(Number);
  const date = parts.length === 3 && parts.every(Number.isFinite)
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTrimester(week, trimester) {
  if (trimester) {
    const trimesterNumber = Number(String(trimester).match(/\d+/)?.[0]);
    if (trimesterNumber) return `Trimester ${trimesterNumber}`;
    if (typeof trimester === 'string') return trimester;
  }
  return week <= 13 ? 'First trimester' : week <= 27 ? 'Second trimester' : 'Third trimester';
}

export default function PregnancyScreen({
  currentWeek = 16,
  onBookDoctor,
  navigation,
}) {
  const { isDarkMode, theme } = useTheme();
  const [pregnancy, setPregnancy] = useState({ current_week: currentWeek });
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    let isMounted = true;
    pregnancyService.getPregnancyStatus()
      .then((result) => {
        if (isMounted && result?.pregnancy) setPregnancy(result.pregnancy);
      })
      .catch((error) => console.warn('[PregnancyScreen] Failed to load pregnancy status:', error));
    return () => { isMounted = false; };
  }, []);

  const week = Math.max(1, Number(pregnancy.current_week || currentWeek || 1));
  const progress = Math.min(week / WEEKS_IN_PREGNANCY, 1);
  const trimester = getTrimester(week, pregnancy.trimester);
  const dueDate = formatDueDate(pregnancy.estimated_due_date);
  const daysUntilDue = Number(pregnancy.days_until_due_date);
  const pregnancyInsights = DEFAULT_PREGNANCY_ARTICLES.filter((article) => (
    article.id !== '1' && (article.id !== '3' || (week >= 14 && week <= 27))
  ));

  const openDrRed = () => navigation?.navigate?.('AICompanion', {
    initialQuery: 'I am pregnant. Can you help me understand how I might be feeling today?',
    autoSend: true,
    timestamp: Date.now(),
  });

  const cardStyle = {
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderWidth: 1,
    borderRadius: 28,
  };

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 2 }}>
        <View>
          <Text style={{ color: theme.textPrimary, fontSize: 23, fontWeight: '900', letterSpacing: -0.4 }}>Pregnancy wellness</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500', marginTop: 3 }}>Your journey at a glance</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Pregnancy care options"
          onPress={onBookDoctor}
          style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
        >
          <Ionicons name="medical-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[cardStyle, { padding: 20, marginBottom: 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.subtleSurface, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Ionicons name="heart-outline" size={21} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '900' }}>Your pregnancy progress</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 2 }}>A little progress, week by week</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ alignItems: 'center', width: RING_SIZE }}>
            <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={{ position: 'absolute' }}>
                <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke={theme.cardBorder} strokeWidth="8" />
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                  rotation="-90"
                  origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                />
              </Svg>
              <Text style={{ color: theme.textPrimary, fontSize: 24, fontWeight: '900' }}>{week}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700', marginTop: -2 }}>of 40 weeks</Text>
            </View>
          </View>

          <View style={{ flex: 1, marginLeft: 18 }}>
            <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }}>CURRENT TRIMESTER</Text>
            <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 4 }}>{trimester}</Text>
            <View style={{ height: 1, backgroundColor: theme.cardBorder, marginVertical: 11 }} />
            <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 }}>ESTIMATED DUE DATE</Text>
            <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '800', marginTop: 4 }}>{dueDate}</Text>
            {Number.isFinite(daysUntilDue) && daysUntilDue >= 0 ? (
              <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{daysUntilDue} days to go</Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={[cardStyle, { flexDirection: 'row', alignItems: 'center', padding: 18, marginBottom: 14, overflow: 'hidden' }]}>
        <View style={{ flex: 1, paddingRight: 4 }}>
          <Text style={{ color: theme.textPrimary, fontSize: 19, fontWeight: '900', lineHeight: 25 }}>How are you feeling today?</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500', lineHeight: 19, marginTop: 5 }}>Check in with yourself and get pregnancy-aware guidance.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={openDrRed}
            activeOpacity={0.85}
            style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#584988', borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10, marginTop: 14 }}
          >
            <Ionicons name="sparkles" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Talk with Dr. Red</Text>
          </TouchableOpacity>
        </View>
        <View style={{ width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#3A1E22' : '#FFF1F4', marginLeft: 8 }}>
          <Ionicons name="happy-outline" size={33} color={colors.primary} />
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Read pregnancy educational insights"
        onPress={() => navigation?.navigate?.('Learn')}
        style={[cardStyle, { padding: 18, marginBottom: 14 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.subtleSurface, marginRight: 10 }}>
            <Ionicons name="book-outline" size={18} color={colors.primary} />
          </View>
          <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '900', flex: 1 }}>Educational insight</Text>
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>WEEK {week}</Text>
        </View>
        <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 5 }}>
          {pregnancy.weekly_milestone_title || 'Your baby is growing every day'}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 }}>
          {pregnancy.weekly_milestone_description || 'Keep checking in with your care team and take time to notice how you feel.'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', marginRight: 5 }}>Explore pregnancy guides</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </View>
      </TouchableOpacity>

      <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: '900', letterSpacing: -0.3, marginTop: 4, marginBottom: 10, paddingHorizontal: 2 }}>
        Pregnancy insights
      </Text>
      <ArticleCarousel
        articles={pregnancyInsights}
        onSelectArticle={setSelectedArticle}
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onBookDoctor}
          style={[cardStyle, { flex: 1, minHeight: 112, padding: 15, justifyContent: 'space-between' }]}
        >
          <Ionicons name="calendar-outline" size={21} color={colors.primary} />
          <View>
            <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '800' }}>Find pregnancy care</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 3 }}>Book a specialist visit</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation?.navigate?.('Learn')}
          style={[cardStyle, { flex: 1, minHeight: 112, padding: 15, justifyContent: 'space-between' }]}
        >
          <Ionicons name="book-outline" size={21} color={colors.primary} />
          <View>
            <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '800' }}>Pregnancy guides</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 3 }}>Explore trusted articles</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
    <AppBottomSheet
      visible={!!selectedArticle}
      onClose={() => setSelectedArticle(null)}
      showHandle
      scrollable
      maxHeight="82%"
    >
      {selectedArticle ? (
        <View style={{ paddingHorizontal: 4, paddingTop: 14, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: selectedArticle.iconBg || theme.subtleSurface, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Ionicons name={selectedArticle.icon || 'book-outline'} size={20} color={selectedArticle.iconColor || colors.primary} />
            </View>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 0.5, flex: 1 }}>{selectedArticle.category}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600' }}>{selectedArticle.readTime}</Text>
          </View>
          <Text style={{ color: theme.textPrimary, fontSize: 21, lineHeight: 27, fontWeight: '900', marginBottom: 10 }}>{selectedArticle.title}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 14 }}>{selectedArticle.summary}</Text>
          <Text style={{ color: theme.textPrimary, fontSize: 14, lineHeight: 23 }}>{selectedArticle.fullContent || selectedArticle.summary}</Text>
          <TouchableOpacity
            onPress={() => setSelectedArticle(null)}
            activeOpacity={0.85}
            style={{ alignSelf: 'center', minWidth: 132, alignItems: 'center', borderRadius: 24, backgroundColor: isDarkMode ? '#FFFFFF' : '#111827', paddingHorizontal: 24, paddingVertical: 13, marginTop: 20 }}
          >
            <Text style={{ color: isDarkMode ? '#161616' : '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Got it</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </AppBottomSheet>
    </>
  );
}
