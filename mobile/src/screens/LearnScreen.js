import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  TextInput,
  Modal,
  Image,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getEducationArticles } from '../services/educationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ALL_ARTICLES = [
  {
    id: '1',
    title: 'Sex for Pregnancy Guide',
    category: 'FERTILITY',
    readTime: '4 min read',
    readers: '14.8k',
    author: 'Clinical Review Board • Fertility Care',
    summary: 'The best days for intimacy when you are trying to conceive.',
    bullets: [
      'Track ovulation with morning body temp and test strips.',
      'Your highest chance of getting pregnant is 1–2 days before ovulation.',
      'Stay hydrated and keep stress levels manageable.',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    featured: true,
  },
  {
    id: '2',
    title: 'Early Signs of Pregnancy',
    category: 'PREGNANCY',
    readTime: '5 min read',
    readers: '11.2k',
    author: 'Obstetrics & Gynecology Editorial Team',
    summary: 'Recognizing early body changes in the first few weeks of pregnancy.',
    bullets: [
      'Spotting vs your regular period: how to tell the difference.',
      'Hormone changes causing tiredness and tender breasts.',
      'The best time to take a home pregnancy test for accurate results.',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'How to Get Pregnant Faster',
    category: 'CONCEPTION',
    readTime: '6 min read',
    readers: '16.5k',
    author: 'Reproductive Endocrinology Advisory',
    summary: 'Practical tips on cycle tracking, healthy lifestyle habits, and timing intimacy.',
    bullets: [
      'Understanding discharge changes when you are most fertile.',
      'Taking essential prenatal vitamins like Folic Acid early.',
      'Sharing fertile window updates with your partner in Red Apple.',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '4',
    title: 'Vaginal Discharge Color Guide',
    category: 'HEALTH GUIDE',
    readTime: '3 min read',
    readers: '9.3k',
    author: 'Maternal-Fetal Clinical Team',
    summary: 'Your daily discharge is a healthy signal that changes naturally with your cycle.',
    bullets: [
      'Clear & stretchy (like egg white): Your most fertile days.',
      'Creamy & white: Normal discharge after ovulation (pre-period).',
      'Thick, clumpy white with itching: Worth checking with a doctor for a yeast infection.',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
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
    thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
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
    thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
  },
];

export default function LearnScreen({ openArticleDetails }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [articles, setArticles] = useState(ALL_ARTICLES);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const res = await getEducationArticles();
      if (res?.articles && res.articles.length > 0) {
        const enriched = res.articles.map((art, idx) => ({
          ...art,
          thumbnail:
            art.thumbnail ||
            ALL_ARTICLES[idx % ALL_ARTICLES.length]?.thumbnail ||
            ALL_ARTICLES[0].thumbnail,
        }));
        setArticles(enriched);
      }
    } catch (e) {
      console.warn('[LearnScreen] Could not fetch live articles:', e?.message);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadArticles();
    setIsRefreshing(false);
  };

  // Derive unique categories from articles
  const allCategories = useMemo(() => {
    const set = new Set();
    articles.forEach((a) => {
      if (a.category) set.add(a.category.toUpperCase());
    });
    return ['ALL', ...Array.from(set)];
  }, [articles]);

  // Filter articles based on search query and category
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      const matchCat =
        selectedCategory === 'ALL' ||
        a.category?.toUpperCase() === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        a.title?.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.author?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q)
      );
    });
  }, [articles, selectedCategory, searchQuery]);

  const isFiltering = searchQuery.trim().length > 0 || selectedCategory !== 'ALL';
  const featured = !isFiltering ? (filteredArticles.find((a) => a.featured) || filteredArticles[0]) : null;
  const gridArticles = !isFiltering ? filteredArticles.filter((a) => a.id !== featured?.id) : filteredArticles;

  return (
    <View style={styles.screenContainer}>
      {/* TOP SEARCH BAR & FILTER BUTTON */}
      <View style={styles.topSearchFilterWrapper}>
        <View style={styles.topSearchFilterRow}>
          <View style={styles.searchBarGlass}>
            <Ionicons name="search" size={19} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search articles, guides..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.filterButton,
              selectedCategory !== 'ALL' && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={selectedCategory !== 'ALL' ? '#FFFFFF' : '#374151'}
            />
            {selectedCategory !== 'ALL' && <View style={styles.filterActiveDot} />}
          </TouchableOpacity>
        </View>

        {/* ACTIVE FILTER CHIP (IF FILTERED) */}
        {selectedCategory !== 'ALL' && (
          <View style={styles.activeFilterPillRow}>
            <View style={styles.activeFilterPill}>
              <Text style={styles.activeFilterPillText}>{selectedCategory}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSelectedCategory('ALL')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close-circle" size={15} color={colors.primary} style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedCategory('ALL')}>
              <Text style={styles.clearAllFilterText}>Clear Filter</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

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
        {/* HERO FEATURED IMMERSIVE CARD (WHEN BROWSING ALL) */}
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
                featured.bullets,
                featured.content,
                featured.thumbnail
              )
            }
          >
            <ImageBackground
              source={{ uri: featured.thumbnail }}
              style={styles.heroImageBackground}
              imageStyle={styles.heroCardImageStyle}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
                locations={[0, 0.45, 1]}
                style={styles.heroGradientContent}
              >
                <View style={styles.heroCategoryBadge}>
                  <Text style={styles.heroCategoryBadgeText}>{featured.category}</Text>
                </View>

                <View>
                  <Text style={styles.heroCardTitle}>{featured.title}</Text>
                  <View style={styles.heroCardMetaRow}>
                    <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.88)" style={{ marginRight: 6 }} />
                    <Text style={styles.heroCardMetaText}>
                      {featured.readers} readers • {featured.readTime}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        )}

        {/* 2-COLUMN BENTO GRID OF IMMERSIVE CARDS */}
        {gridArticles.length > 0 ? (
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
                    item.bullets,
                    item.content,
                    item.thumbnail
                  )
                }
              >
                <ImageBackground
                  source={{ uri: item.thumbnail }}
                  style={styles.bentoImageBackground}
                  imageStyle={styles.bentoCardImageStyle}
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.38)', 'rgba(0,0,0,0.88)']}
                    locations={[0, 0.4, 1]}
                    style={styles.bentoGradientContent}
                  >
                    <View style={styles.bentoCategoryBadge}>
                      <Text style={styles.bentoCategoryBadgeText}>{item.category}</Text>
                    </View>

                    <View>
                      <Text style={styles.bentoCardTitle} numberOfLines={2}>
                        {item.title}
                      </Text>

                      <View style={styles.bentoCardMetaRow}>
                        <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.8)" style={{ marginRight: 4 }} />
                        <Text style={styles.bentoCardMetaText}>{item.readers}</Text>
                        <Text style={styles.bentoCardMetaText}> • {item.readTime}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* EMPTY STATE */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="search-outline" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No articles found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `We couldn't find any articles matching "${searchQuery}".`
                : 'No articles in this category.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.resetButton}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* CATEGORY FILTER MODAL */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Filter Articles</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionLabel}>CATEGORY</Text>
            <View style={styles.categoriesWrap}>
              {allCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.75}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat === 'ALL' ? 'All Articles' : cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  topSearchFilterWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  topSearchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBarGlass: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterActiveDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeFilterPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeFilterPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  clearAllFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  heroFeaturedCard: {
    height: 230,
    borderRadius: 26,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#374151',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  heroImageBackground: {
    width: '100%',
    height: '100%',
  },
  heroCardImageStyle: {
    borderRadius: 26,
  },
  heroGradientContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  heroCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  heroCategoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  heroCardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCardMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  bentoCard: {
    width: (SCREEN_WIDTH - 36) / 2,
    height: 205,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#374151',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  bentoImageBackground: {
    width: '100%',
    height: '100%',
  },
  bentoCardImageStyle: {
    borderRadius: 22,
  },
  bentoGradientContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 14,
  },
  bentoCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bentoCategoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bentoCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 6,
    lineHeight: 19,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bentoCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bentoCardMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
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
  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  /* Filter Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
});
