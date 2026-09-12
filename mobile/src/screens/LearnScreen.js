import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ALL_ARTICLES = [
  {
    id: '1',
    title: 'Sex for Pregnancy Guide',
    category: 'FERTILITY',
    readTime: '4 min read',
    readers: '12.4k',
    author: 'Dr. Mesal Okubor, MBBS, FWACS • Fertility Specialist',
    summary: 'The best days for intimacy when you are trying to conceive.',
    bullets: [
      'Track ovulation with morning body temp and test strips.',
      'Your highest chance of getting pregnant is 1–2 days before ovulation.',
      'Stay hydrated and keep stress levels manageable.',
    ],
    icon: 'heart',
    iconBg: '#FFE5E9',
    iconColor: '#DC2626',
    featured: true,
  },
  {
    id: '2',
    title: 'Early Signs of Pregnancy',
    category: 'PREGNANCY',
    readTime: '5 min read',
    readers: '9.8k',
    author: 'Dr. Mesal Okubor, MBBS, FWACS • Obstetrician & Gynecologist',
    summary: 'Recognizing early body changes in the first few weeks of pregnancy.',
    bullets: [
      'Spotting vs your regular period: how to tell the difference.',
      'Hormone changes causing tiredness and tender breasts.',
      'The best time to take a home pregnancy test for accurate results.',
    ],
    icon: 'fitness',
    iconBg: '#E8F5E9',
    iconColor: '#2E7D32',
  },
  {
    id: '3',
    title: 'How to Get Pregnant Faster',
    category: 'CONCEPTION',
    readTime: '6 min read',
    readers: '14.2k',
    author: 'Dr. Mesal Okubor, MBBS, FWACS • Reproductive Health Lead',
    summary: 'Practical tips on cycle tracking, healthy lifestyle habits, and timing intimacy.',
    bullets: [
      'Understanding discharge changes when you are most fertile.',
      'Taking essential prenatal vitamins like Folic Acid early.',
      'Sharing fertile window updates with your partner in Red Apple.',
    ],
    icon: 'sparkles',
    iconBg: '#FFF3E0',
    iconColor: '#E65100',
  },
  {
    id: '4',
    title: 'Vaginal Discharge Color Guide',
    category: 'HEALTH GUIDE',
    readTime: '3 min read',
    readers: '8.5k',
    author: 'Dr. Mesal Okubor, MBBS, FWACS • Lead Consultant',
    summary: 'Your daily discharge is a healthy signal that changes naturally with your cycle.',
    bullets: [
      'Clear & stretchy (like egg white): Your most fertile days.',
      'Creamy & white: Normal discharge after ovulation (pre-period).',
      'Thick, clumpy white with itching: Worth checking with a doctor for a yeast infection.',
    ],
    icon: 'water',
    iconBg: '#F3E8FF',
    iconColor: '#7C3AED',
  },
  {
    id: '5',
    title: '9 Life-Changing Wellness Tips',
    category: 'WELLNESS',
    readTime: '5 min read',
    readers: '11.1k',
    author: 'Maya Lin • Holistic Women Health Coach',
    summary: 'Daily self-care habits to help you reduce stress and ease hormone swings.',
    bullets: [
      'Get extra restful sleep the week before your period.',
      'Eat nourishing foods like fish, berries, beans, and dark greens.',
      'Choose gentle walking or stretching over intense workouts when feeling crampy.',
    ],
    icon: 'leaf',
    iconBg: '#E0F2F1',
    iconColor: '#00897B',
  },
  {
    id: '6',
    title: 'Period Pain Relief Yoga',
    category: 'CRAMP RELIEF',
    readTime: '8 min video',
    readers: '16.7k',
    author: 'Aria Ross • Prenatal & Pelvic Yoga Instructor',
    summary: 'Gentle stretches and relaxing poses to ease period cramps and calm lower belly muscles.',
    bullets: [
      'Child Pose: Eases lower back tightness and belly pressure.',
      'Cat-Cow Stretch: Gently loosens your spine and relieves cramp aches.',
      'Reclining Stretch: Deeply relaxes tight pelvic and lower belly muscles.',
    ],
    icon: 'play-circle',
    iconBg: '#FFF8E1',
    iconColor: '#F57F17',
  },
];

const TOPICS_LIST = [
  { id: 't1', title: 'Ovulation', count: '14 Articles', icon: 'egg-outline', color: '#DC2626', bg: '#FFE5E9' },
  { id: 't2', title: 'Conception', count: '9 Articles', icon: 'heart-outline', color: '#E65100', bg: '#FFF3E0' },
  { id: 't3', title: 'Period Cramps', count: '12 Articles', icon: 'water-outline', color: '#7C3AED', bg: '#F3E8FF' },
  { id: 't4', title: 'Hormones', count: '8 Articles', icon: 'pulse-outline', color: '#00897B', bg: '#E0F2F1' },
  { id: 't5', title: 'Fertility Food', count: '11 Articles', icon: 'nutrition-outline', color: '#2E7D32', bg: '#E8F5E9' },
  { id: 't6', title: 'Yoga & Body', count: '7 Videos', icon: 'body-outline', color: '#D81B60', bg: '#FCE4EC' },
  { id: 't7', title: 'Mental Wellness', count: '6 Guides', icon: 'sparkles-outline', color: '#F57F17', bg: '#FFF8E1' },
  { id: 't8', title: 'Partner Sync', count: '5 Guides', icon: 'people-outline', color: '#1E88E5', bg: '#E3F2FD' },
  { id: 't9', title: 'Cycle Irregularity', count: '10 Articles', icon: 'medical-outline', color: '#C2185B', bg: '#F8BBD0' },
  { id: 't10', title: 'Pregnancy Prep', count: '15 Articles', icon: 'flower-outline', color: '#8E24AA', bg: '#F3E5F5' },
  { id: 't11', title: 'Postmenopause', count: '8 Articles', icon: 'shield-checkmark-outline', color: '#5E35B1', bg: '#EDE7F6' },
  { id: 't12', title: 'Doctor QA', count: '20 Videos', icon: 'videocam-outline', color: '#008080', bg: '#E0F2F1' },
];

export default function LearnScreen({ openArticleDetails }) {
  const [activeTab, setActiveTab] = useState('guides');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((res) => setTimeout(res, 600));
    setIsRefreshing(false);
  };

  const featured = ALL_ARTICLES.find((a) => a.featured) || ALL_ARTICLES[0];
  const gridArticles = ALL_ARTICLES.filter((a) => a.id !== featured?.id);

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, '#E11D48']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {/* PILL SEGMENTED SWITCHER (MATCHING REFERENCE MOCKUP 2) */}
        <View style={styles.segmentedSwitcherWrapper}>
          <View style={styles.segmentedSwitcher}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.segmentTab, activeTab === 'guides' && styles.segmentTabActive]}
              onPress={() => setActiveTab('guides')}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeTab === 'guides' && styles.segmentTabTextActive,
                ]}
              >
                Guides
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.segmentTab, activeTab === 'topics' && styles.segmentTabActive]}
              onPress={() => setActiveTab('topics')}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  activeTab === 'topics' && styles.segmentTabTextActive,
                ]}
              >
                Topics
              </Text>
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>12</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'guides' ? (
          <>
            {/* HERO FEATURED WHITE CARD (MATCHING CASPIAN DRAKE CARD IN MOCKUP 2) */}
            {featured && (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.heroFeaturedCard}
                onPress={() =>
                  openArticleDetails(
                    featured.title,
                    featured.category,
                    featured.readTime,
                    featured.author,
                    featured.summary,
                    featured.bullets
                  )
                }
              >
                <View style={[styles.heroThumbnailContainer, { backgroundColor: featured.iconBg }]}>
                  <Ionicons name={featured.icon} size={38} color={featured.iconColor} />
                </View>

                <Text style={styles.heroCardTitle}>{featured.title}</Text>

                <View style={styles.heroCardMetaRow}>
                  <Ionicons name="people-outline" size={15} color="#6B7280" style={{ marginRight: 5 }} />
                  <Text style={styles.heroCardMetaText}>
                    {featured.readers} readers • {featured.readTime}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* 2-COLUMN BENTO GRID OF WHITE CARDS (MATCHING MOCKUP 2) */}
            <View style={styles.bentoGrid}>
              {gridArticles.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.88}
                  style={styles.bentoCard}
                  onPress={() =>
                    openArticleDetails(
                      item.title,
                      item.category,
                      item.readTime,
                      item.author,
                      item.summary,
                      item.bullets
                    )
                  }
                >
                  <View style={[styles.bentoCardThumbnail, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={28} color={item.iconColor} />
                  </View>

                  <Text style={styles.bentoCardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.bentoCardMetaRow}>
                    <Ionicons name="people-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                    <Text style={styles.bentoCardMetaText}>{item.readers}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          /* ALL TOPICS GRID */
          <View style={styles.bentoGrid}>
            {TOPICS_LIST.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                activeOpacity={0.88}
                style={styles.bentoCard}
                onPress={() => {
                  const match = ALL_ARTICLES.find(
                    (a) =>
                      a.category.toLowerCase().includes(topic.title.toLowerCase()) ||
                      a.title.toLowerCase().includes(topic.title.toLowerCase())
                  );
                  if (match) {
                    openArticleDetails(
                      match.title,
                      match.category,
                      match.readTime,
                      match.author,
                      match.summary,
                      match.bullets
                    );
                  }
                }}
              >
                <View style={[styles.bentoCardThumbnail, { backgroundColor: topic.bg }]}>
                  <Ionicons name={topic.icon} size={28} color={topic.color} />
                </View>
                <Text style={styles.bentoCardTitle}>{topic.title}</Text>
                <Text style={styles.bentoCardMetaText}>{topic.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Pure white theme
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  topSearchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBarGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  segmentedSwitcherWrapper: {
    alignItems: 'center',
    marginBottom: 18,
  },
  segmentedSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 24,
    padding: 4,
  },
  segmentTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  segmentTabTextActive: {
    color: '#111827',
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  heroFeaturedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  heroThumbnailContainer: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroCardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  heroCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCardMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  bentoCard: {
    width: (SCREEN_WIDTH - 36) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  bentoCardThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bentoCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
    marginBottom: 6,
    minHeight: 38,
  },
  bentoCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bentoCardMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  floatingActionStack: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    alignItems: 'center',
    gap: 10,
  },
  floatingActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111827', // Crisp dark floating buttons for high contrast matching mockup
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingBtnBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  floatingBtnBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
