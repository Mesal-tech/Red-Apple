import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function LearnScreen({ openArticleDetails }) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.pageScrollContentNoPadding} showsVerticalScrollIndicator={false}>
      <View style={[styles.searchBarRow, { marginHorizontal: 20 }]}>
        <Ionicons name="search-outline" size={20} color="#888888" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles, guides, topics..."
          placeholderTextColor="#A0A0A0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#888888" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.categoryBadgeCard}
          onPress={() => openArticleDetails(
            'Sex for Pregnancy Guide',
            'FERTILITY',
            '4 min read',
            'Dr. Elena Vance • Reproductive Endocrinologist',
            'Optimizing conception involves timing intercourse during your peak fertile window.',
            [
              'Track ovulation via basal body temperature and LH surge strips.',
              'The highest probability of conception occurs 1-2 days before ovulation.',
              'Maintain healthy hydration and stress management routines.',
            ]
          )}
        >
          <View style={styles.categoryBadgeIconCircle}>
            <Ionicons name="heart-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.categoryBadgeText}>Sex for{'\n'}pregnancy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.categoryBadgeCard}
          onPress={() => openArticleDetails(
            'Early Signs of Pregnancy',
            'PREGNANCY',
            '5 min read',
            'Dr. Michael Chen • Obstetrician',
            'Recognizing the subtle physiological shifts that occur within the first weeks of conception.',
            [
              'Implantation spotting vs regular menstrual flow differences.',
              'Hormonal surges triggering mild fatigue and tender breast tissue.',
              'Optimal timing for taking at-home hCG pregnancy tests.',
            ]
          )}
        >
          <View style={styles.categoryBadgeIconCircle}>
            <Ionicons name="fitness-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.categoryBadgeText}>Early signs{'\n'}of pregnancy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.categoryBadgeCard}
          onPress={() => openArticleDetails(
            'How to Get Pregnant Faster',
            'CONCEPTION',
            '6 min read',
            'Dr. Clara Adams • Fertility Specialist',
            'A comprehensive roadmap detailing cycle monitoring, lifestyle tweaks, and partner synchronization.',
            [
              'Understanding cervical mucus texture shifts near ovulation.',
              'Supplementing essential prenatal vitamins like Folic Acid.',
              'Syncing tracking data with your partner in Red Apple.',
            ]
          )}
        >
          <View style={styles.categoryBadgeIconCircle}>
            <Ionicons name="body-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.categoryBadgeText}>How to get{'\n'}pregnant</Text>
        </TouchableOpacity>
      </ScrollView>

      <Text style={[styles.learnSectionTitle, { marginHorizontal: 20 }]}>Trending now</Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.trendingCardPurple}
          onPress={() => openArticleDetails(
            'Vaginal Discharge Color Guide',
            'HEALTH GUIDE',
            '3 min read',
            'Dr. Sarah Jenkins, MD • Gynecologist',
            'Your cervical fluid provides critical real-time insight into your hormonal health and fertility phase.',
            [
              'Clear & Stretchy (Egg White): Peak fertility window.',
              'Creamy & White: Normal post-ovulation luteal phase.',
              'Thick or Clumpy White: Possible yeast imbalance consultation recommended.',
            ]
          )}
        >
          <View style={styles.cardHeaderTagRow}>
            <Text style={styles.cardTagText}>GUIDE</Text>
          </View>
          <Text style={styles.trendingCardTitle}>Vaginal discharge color guide</Text>
          <Text style={styles.trendingCardMeta}>3 min read • Medically Reviewed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.trendingCardPink}
          onPress={() => openArticleDetails(
            '9 Life-Changing Wellness & Self-Care Tips',
            'WELLNESS',
            '5 min read',
            'Maya Lin • Holisitic Women Health Coach',
            'Actionable self-care practices designed to balance cortisol and relieve hormonal tension.',
            [
              'Prioritize restorative sleep during the pre-menstrual luteal phase.',
              'Incorporate anti-inflammatory foods like berries, salmon, and leafy greens.',
              'Engage in gentle movement like yoga rather than high-intensity cardio when cramping.',
            ]
          )}
        >
          <View style={styles.cardHeaderTagRow}>
            <Text style={styles.cardTagText}>WELLNESS</Text>
          </View>
          <Text style={styles.trendingCardTitle}>9 life-changing wellness & self-care tips</Text>
          <Text style={styles.trendingCardMeta}>5 min read • Expert Approved</Text>
        </TouchableOpacity>
      </ScrollView>

      <Text style={[styles.learnSectionTitle, { marginHorizontal: 20 }]}>When to have conception sex</Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.courseCardPeach}
          onPress={() => openArticleDetails(
            'Sex for Pregnancy Video Course',
            'VIDEO COURSE',
            '12 mins',
            'Dr. Elena Vance • Reproductive Endocrinologist',
            '4 video lessons covering optimal conception timing, position comfort, and ovulation tracking.',
            [
              'Lesson 1: Identifying your 6-day fertile window.',
              'Lesson 2: Sperm lifespan and ovulation synchronization.',
              'Lesson 3: Post-intercourse rest and myths debunked.',
              'Lesson 4: Maintaining emotional closeness while trying to conceive.',
            ]
          )}
        >
          <View style={styles.videoBadge}>
            <Ionicons name="play-circle" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.videoBadgeText}>Video Course</Text>
          </View>
          <Text style={styles.courseCardTitle}>Sex for pregnancy</Text>
          <Text style={styles.courseCardSub}>4 lessons • 12 mins</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.courseCardSky}
          onPress={() => openArticleDetails(
            'How Long Does Ovulation Last?',
            'OVULATION',
            '4 min read',
            'Dr. Clara Adams • Fertility Specialist',
            'An unfertilized egg survives for 12 to 24 hours after release from the ovary.',
            [
              'Though ovulation lasts 12-24 hours, sperm can survive inside up to 5 days.',
              'This creates a total 6-day fertile window per menstrual cycle.',
              'Tracking LH surges helps pinpoint the exact 24-36 hour pre-ovulation window.',
            ]
          )}
        >
          <View style={styles.articleBadgeSky}>
            <Text style={styles.skyBadgeText}>OVULATION</Text>
          </View>
          <Text style={styles.courseCardTitle}>How long does ovulation last?</Text>
          <Text style={styles.courseCardSub}>4 min read</Text>
        </TouchableOpacity>
      </ScrollView>

      <Text style={[styles.learnSectionTitle, { marginHorizontal: 20 }]}>Menstrual cramps relief</Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.reliefCardYellow}
          onPress={() => openArticleDetails(
            'Period Pain Relief Yoga & Stretches',
            'CRAMP RELIEF',
            '8 mins',
            'Aria Ross • Certified Prenatal & Pelvic Yoga Instructor',
            'Gentle pelvic tilts and child pose stretches engineered to relieve uterine muscle contractions.',
            [
              'Child Pose: Relieves lower back tension and sacral pressure.',
              'Cat-Cow Stretch: Increases pelvic blood flow and reduces cramping intensity.',
              'Reclined Bound Angle: Deeply relaxes pelvic floor muscles.',
            ]
          )}
        >
          <View style={styles.playIconOverlay}>
            <Ionicons name="play" size={18} color={colors.primary} />
          </View>
          <Text style={styles.reliefCardTitle}>Period pain relief yoga & stretches</Text>
          <Text style={styles.reliefCardMeta}>8 mins • Guided Video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.reliefCardOrange}
          onPress={() => openArticleDetails(
            'Foot Massage for Cramp Relief',
            'REFLEXOLOGY',
            '5 mins',
            'Dr. Marcus Thorne • Reflexologist',
            'Targeted acupressure on Spleen-6 (SP6) and Kidney points to alleviate menstrual cramps.',
            [
              'Locate SP6 four finger-widths above the inner ankle bone.',
              'Apply firm, circular pressure for 2-3 minutes per leg.',
              'Pair acupressure with warm herbal compresses for optimal relief.',
            ]
          )}
        >
          <View style={styles.playIconOverlay}>
            <Ionicons name="play" size={18} color={colors.primary} />
          </View>
          <Text style={styles.reliefCardTitle}>Foot massage for cramp relief</Text>
          <Text style={styles.reliefCardMeta}>5 mins • Step-by-Step</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageScrollContentNoPadding: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EBEBEF',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  categoryBadgeCard: {
    width: 124,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginRight: 12,
  },
  categoryBadgeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
  learnSectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  trendingCardPurple: {
    width: 190,
    height: 170,
    backgroundColor: '#F3E8FF',
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    marginRight: 12,
  },
  trendingCardPink: {
    width: 190,
    height: 170,
    backgroundColor: '#FFEBEE',
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    marginRight: 12,
  },
  cardHeaderTagRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  trendingCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  trendingCardMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  courseCardPeach: {
    width: 190,
    height: 160,
    backgroundColor: '#FFEDD5',
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    marginRight: 12,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  videoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  courseCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  courseCardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  courseCardSky: {
    width: 190,
    height: 160,
    backgroundColor: '#E0F2FE',
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    marginRight: 12,
  },
  articleBadgeSky: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  skyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reliefCardYellow: {
    width: 190,
    height: 150,
    backgroundColor: '#FEF08A',
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    marginRight: 12,
  },
  reliefCardOrange: {
    width: 190,
    height: 150,
    backgroundColor: '#FFEDD5',
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    marginRight: 12,
  },
  playIconOverlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reliefCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 19,
  },
  reliefCardMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
