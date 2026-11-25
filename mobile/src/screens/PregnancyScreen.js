import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import * as pregnancyService from '../services/pregnancyService';
import { DEFAULT_PREGNANCY_ARTICLES } from '../components/ArticleCarousel';
import AppBottomSheet from '../components/AppBottomSheet';
import PregnancyFetus3D from '../components/PregnancyFetus3D';
import StageEducationSection from '../components/StageEducationSection';
import EducationArticleModals from '../components/EducationArticleModals';

const WEEKS_IN_PREGNANCY = 40;

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
  const [selectedEducationArticle, setSelectedEducationArticle] = useState(null);
  const [isReadingEducationArticle, setIsReadingEducationArticle] = useState(false);

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

  const openPregnancyProgress = () => setSelectedArticle({
    pregnancyProgress: true,
    category: 'YOUR PREGNANCY JOURNEY',
    title: `Week ${week} of your pregnancy`,
    summary: `${trimester} · ${Math.round(progress * 100)}% through your 40-week journey.`,
    fullContent: `${pregnancy.weekly_milestone_description || 'Your baby is growing every day. Keep checking in with your care team and take time to notice how you feel.'}\n\nEstimated due date: ${dueDate}${Number.isFinite(daysUntilDue) && daysUntilDue >= 0 ? ` (${daysUntilDue} days to go)` : ''}.`,
    icon: 'heart-outline',
    iconBg: '#FFF0EA',
    iconColor: '#C66767',
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
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        onPress={openPregnancyProgress}
        accessibilityRole="button"
        accessibilityLabel={`Your pregnancy journey, week ${week} of 40, ${trimester}. Tap for details.`}
        style={{ height: 326, marginBottom: 14, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFFAA' }}
      >
        <LinearGradient
          colors={['#F8D4C7', '#F2A7A6', '#E78F9B']}
          start={{ x: 0.06, y: 0 }}
          end={{ x: 0.94, y: 1 }}
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', top: -44, right: -28, width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFFFFF22' }} />
          <View style={{ position: 'absolute', top: 22, left: 18, zIndex: 2 }}>
            <Text style={{ color: '#713C4A', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }}>YOUR JOURNEY</Text>
            <Text style={{ color: '#713C4A', fontSize: 12, fontWeight: '700', marginTop: 4 }}>{Math.round(progress * 100)}% complete</Text>
            <Text style={{ color: '#713C4A', fontSize: 10, fontWeight: '700', marginTop: 3 }}>{week <= 8 ? 'Embryonic stage' : 'Fetal development'}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 18, paddingBottom: 58 }}>
            <PregnancyFetus3D key={`pregnancy-card-${week}`} week={week} style={{ width: '88%', height: 210 }} />
          </View>
          <Svg width="100%" height="56" viewBox="0 0 360 56" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 70 }}>
            <Path d="M0 10 Q180 92 360 10" fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="2" />
          </Svg>
          <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, minHeight: 68, borderRadius: 36, backgroundColor: '#FFFFFFE8', flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 9 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBE1D7', marginRight: 10 }}>
              <Ionicons name="heart" size={21} color="#C86D78" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#382C31', fontSize: 13, fontWeight: '900' }}>Your Pregnancy Journey</Text>
              <Text style={{ color: '#72636A', fontSize: 11, fontWeight: '600', marginTop: 3 }}>Week {week} · {trimester}</Text>
            </View>
            <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
              <Ionicons name="arrow-forward" size={20} color="#382C31" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <StageEducationSection
        content={{
          feature: pregnancyInsights[0] ? {
            title: 'Pregnancy, week ' + week,
            summary: pregnancyInsights[0].summary,
            actionLabel: 'Read insight',
            icon: pregnancyInsights[0].icon || 'heart-outline',
            article: pregnancyInsights[0],
            railTitle: 'More for your pregnancy',
          } : null,
          articles: pregnancyInsights.slice(1),
        }}
        onSelectArticle={(article) => {
          setSelectedEducationArticle(article);
          setIsReadingEducationArticle(false);
        }}
        theme={theme}
        isDarkMode={isDarkMode}
      />


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
          {selectedArticle.pregnancyProgress ? (
            <View style={{ height: 280, borderRadius: 24, overflow: 'hidden', backgroundColor: '#F8E3DB', marginBottom: 14 }}>
              <PregnancyFetus3D key={`pregnancy-detail-${week}`} week={week} style={{ flex: 1 }} />
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' }}>
                <Text style={{ color: '#713C4A', fontSize: 12, fontWeight: '800' }}>Week {week} · {trimester}</Text>
              </View>
            </View>
          ) : null}
          <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 14 }}>{selectedArticle.summary}</Text>
          {selectedArticle.pregnancyProgress ? (
            <Text style={{ color: theme.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 12 }}>
              Educational illustration of typical development, not a scan or a medical assessment. Individual development varies.
            </Text>
          ) : null}
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
    <EducationArticleModals
      article={selectedEducationArticle}
      isReading={isReadingEducationArticle}
      onReadFull={() => setIsReadingEducationArticle(true)}
      onClosePreview={() => setSelectedEducationArticle(null)}
      onCloseReader={() => setIsReadingEducationArticle(false)}
      onAskDrRed={(article) => {
        const title = article?.title || 'this article';
        setIsReadingEducationArticle(false);
        setSelectedEducationArticle(null);
        navigation?.navigate?.('AICompanion', {
          initialQuery: `Hi Dr. Red, I was reading your article "${title}". Can you give me more insights on how this relates to my pregnancy?`,
          autoSend: true,
          timestamp: Date.now(),
        });
      }}
    />
    </>
  );
}
