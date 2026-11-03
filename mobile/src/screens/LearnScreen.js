import React, { useState, useEffect, useMemo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
  Image,
  ImageBackground,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { getEducationArticles } from '../services/educationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATUSBAR_HEIGHT =
  Platform.OS === 'android'
    ? (StatusBar.currentHeight || 28)
    : 44;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 40 - 12) / 2);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.35);

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
    title: 'Cycle Syncing: Nutrition & Exercise',
    category: 'CYCLE',
    readTime: '4 min read',
    readers: '13.4k',
    author: 'Dr. Sarah Mitchell • OB-GYN',
    summary: 'Aligning your workouts and meals with your 4 cycle phases.',
    bullets: [
      'Follicular Phase: Higher energy, great for cardio & fresh salads.',
      'Ovulatory Phase: Peak strength, HIIT & antioxidant-rich foods.',
      'Luteal Phase: Magnesium-rich seeds & restorative pilates.',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
  },
];

export default function LearnScreen({ navigation }) {
  const { isDarkMode, theme } = useTheme();
  const [articles, setArticles] = useState(ALL_ARTICLES);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isFullReadingMode, setIsFullReadingMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadArticles() {
      try {
        const live = await getEducationArticles();
        if (isMounted && Array.isArray(live) && live.length > 0) {
          const formatted = live.map((art, idx) => ({
            id: art.id || `live_${idx}`,
            title: art.title,
            category: art.category ? art.category.toUpperCase() : 'GENERAL',
            readTime: art.read_time_minutes ? `${art.read_time_minutes} min read` : '4 min read',
            readers: `${(10 + (idx % 8)).toFixed(1)}k`,
            author: art.author_role || 'Medical Review Board',
            summary: art.summary,
            bullets: [
              'Evidence-based clinical insights.',
              'Verified by licensed healthcare specialists.',
            ],
            thumbnail: art.cover_image_url || ALL_ARTICLES[idx % ALL_ARTICLES.length].thumbnail,
            content: art.content,
            featured: idx === 0,
          }));
          setArticles(formatted);
        }
      } catch (_) {}
    }
    loadArticles();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const live = await getEducationArticles();
      if (Array.isArray(live) && live.length > 0) {
        const formatted = live.map((art, idx) => ({
          id: art.id || `live_${idx}`,
          title: art.title,
          category: art.category ? art.category.toUpperCase() : 'GENERAL',
          readTime: art.read_time_minutes ? `${art.read_time_minutes} min read` : '4 min read',
          readers: `${(10 + (idx % 8)).toFixed(1)}k`,
          author: art.author_role || 'Medical Review Board',
          summary: art.summary,
          bullets: [
            'Evidence-based clinical insights.',
            'Verified by licensed healthcare specialists.',
          ],
          thumbnail: art.cover_image_url || ALL_ARTICLES[idx % ALL_ARTICLES.length].thumbnail,
          content: art.content,
          featured: idx === 0,
        }));
        setArticles(formatted);
      }
    } catch (_) {}
    setIsRefreshing(false);
  };

  const allCategories = useMemo(() => {
    const set = new Set();
    articles.forEach((a) => {
      if (a.category) set.add(a.category.toUpperCase());
    });
    return ['ALL', ...Array.from(set)];
  }, [articles]);

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

  const handleOpenArticle = (item) => {
    setSelectedArticle({
      title: item.title,
      category: item.category,
      readTime: item.readTime,
      author: item.author,
      summary: item.summary,
      bulletPoints: item.bullets,
      fullText: item.content || item.summary,
      thumbnail: item.thumbnail,
    });
    setIsFullReadingMode(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent={true} />

      {/* Top Header: Search Bar & Filter Button */}
      <View style={{ paddingTop: STATUSBAR_HEIGHT + 8, paddingHorizontal: 20, paddingBottom: 6, backgroundColor: theme.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDarkMode ? '#2B2B2B' : '#F8FAFC',
              borderRadius: 24,
              height: 48,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: theme.cardBorder,
            }}
          >
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={{
                flex: 1,
                fontSize: 13.5,
                color: theme.textPrimary,
                marginLeft: 10,
                fontWeight: '500',
                paddingVertical: 0,
              }}
              placeholder="Search articles, guides..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectedCategory !== 'ALL' ? '#DC2626' : (isDarkMode ? '#2B2B2B' : '#F8FAFC'),
              borderWidth: 1,
              borderColor: selectedCategory !== 'ALL' ? '#DC2626' : theme.cardBorder,
            }}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={selectedCategory !== 'ALL' ? '#FFFFFF' : (isDarkMode ? '#ABABAB' : '#334155')}
            />
          </TouchableOpacity>
        </View>

        {/* Horizontal Category Filter Strip */}
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 6, gap: 8 }}
        >
          {allCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.75}
                onPress={() => setSelectedCategory(cat)}
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isSelected ? (isDarkMode ? '#FFFFFF' : '#111827') : (isDarkMode ? '#2B2B2B' : '#F1F5F9'),
                  borderWidth: 1,
                  borderColor: isSelected ? (isDarkMode ? '#FFFFFF' : '#111827') : theme.cardBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? '800' : '600',
                    color: isSelected ? (isDarkMode ? '#161616' : '#FFFFFF') : (isDarkMode ? '#ABABAB' : '#475569'),
                  }}
                >
                  {cat === 'ALL' ? 'All' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.textPrimary}
            colors={[colors.primary, '#E11D48']}
            progressBackgroundColor={theme.card}
          />
        }
      >
        {/* Hero Featured Card */}
        {featured && (
          <TouchableOpacity
            activeOpacity={0.92}
            style={{
              marginHorizontal: 20,
              marginBottom: 20,
              height: 240,
              borderRadius: 26,
              overflow: 'hidden',
              backgroundColor: '#E2E8F0',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 4,
              position: 'relative',
            }}
            onPress={() => handleOpenArticle(featured)}
          >
            <Image
              source={{ uri: featured.thumbnail }}
              style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
              resizeMode="cover"
            />
            {/* Category Pill Top Left */}
            <View
              style={{
                position: 'absolute',
                top: 18,
                left: 18,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 14,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#0F172A', letterSpacing: 0.7 }}>
                {featured.category}
              </Text>
            </View>

            {/* Title & Metadata Bottom Left over Gradient */}
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.45)', 'rgba(0, 0, 0, 0.9)']}
              locations={[0, 0.4, 1]}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: 18,
                paddingTop: 44,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '900',
                  color: '#FFFFFF',
                  lineHeight: 26,
                  letterSpacing: -0.3,
                  marginBottom: 6,
                }}
              >
                {featured.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="people-outline" size={13} color="rgba(255, 255, 255, 0.9)" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginLeft: 4 }}>
                  {featured.readers} readers • {featured.readTime}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* 2-Column Bento Grid */}
        {gridArticles.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
            }}
          >
            {gridArticles.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                style={{
                  width: CARD_WIDTH,
                  marginBottom: 18,
                }}
                onPress={() => handleOpenArticle(item)}
              >
                {/* Thumbnail Image Container */}
                <View
                  style={{
                    width: CARD_WIDTH,
                    height: Math.round(CARD_WIDTH * 0.82),
                    borderRadius: 20,
                    overflow: 'hidden',
                    backgroundColor: '#F1F5F9',
                    position: 'relative',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  {/* Floating Category Pill on Thumbnail */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      paddingHorizontal: 8,
                      paddingVertical: 3.5,
                      borderRadius: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.12,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#0F172A', letterSpacing: 0.5 }}>
                      {item.category}
                    </Text>
                  </View>
                </View>

                {/* Title & Metadata (Below Thumbnail, matching HomeScreen) */}
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: theme.textPrimary,
                    lineHeight: 19,
                    marginTop: 8,
                  }}
                >
                  {item.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="people-outline" size={12} color={theme.textSecondary} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginLeft: 3 }}>
                    {item.readers} • {item.readTime}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Empty State */
          <View className="items-center py-16 px-6">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Ionicons name="search-outline" size={30} color="#9CA3AF" />
            </View>
            <Text className="text-base font-extrabold text-gray-800 mb-1">No articles found</Text>
            <Text className="text-xs text-gray-500 text-center mb-5">
              {searchQuery
                ? `We couldn't find any articles matching "${searchQuery}".`
                : 'No articles in this category.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              className="bg-primary px-5 py-2.5 rounded-full"
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
            >
              <Text className="text-xs font-bold text-white">Reset Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Category Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1 bg-black/40 justify-center p-5"
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-extrabold text-gray-900">Filter Articles</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">CATEGORY</Text>
            <View className="flex-row flex-wrap gap-2">
              {allCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.75}
                    className={`px-3.5 py-2 rounded-2xl border ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text className={`text-xs ${isSelected ? 'font-black text-white' : 'font-semibold text-gray-700'}`}>
                      {cat === 'ALL' ? 'All Articles' : cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Article Preview Bottom Sheet (Matching HomeScreen) */}
      <Modal
        visible={!!selectedArticle && !isFullReadingMode}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setSelectedArticle(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
          onPress={() => setSelectedArticle(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.modalBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              overflow: 'hidden',
              maxHeight: '85%',
            }}
          >
            {selectedArticle?.thumbnail ? (
              <View style={{ width: '100%', height: 190, position: 'relative' }}>
                <Image
                  source={{ uri: selectedArticle.thumbnail }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 16,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setSelectedArticle(null)}
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
                <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {selectedArticle?.category}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDarkMode ? '#363636' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setSelectedArticle(null)}
                >
                  <Ionicons name="close" size={18} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.textPrimary, lineHeight: 26, marginBottom: 6 }}>
                {selectedArticle?.title}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '600', marginBottom: 12 }}>
                {selectedArticle?.readTime} • {selectedArticle?.author}
              </Text>

              <View style={{ height: 1, backgroundColor: theme.divider, marginVertical: 8 }} />

              <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 20, marginBottom: 16 }}>
                {selectedArticle?.summary}
              </Text>

              {selectedArticle?.bulletPoints && selectedArticle.bulletPoints.length > 0 && (
                <>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: theme.textPrimary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Key Takeaways
                  </Text>
                  {selectedArticle.bulletPoints.map((point, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
                      <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1, lineHeight: 18, fontWeight: '500' }}>
                        {point}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Read Full Article Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                  paddingVertical: 13,
                  borderRadius: 50,
                  marginTop: 16,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 2,
                }}
                onPress={() => setIsFullReadingMode(true)}
              >
                <Ionicons name="book" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Read Full Article</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Full Article Reader Page Modal (Matching HomeScreen) */}
      <Modal
        visible={!!selectedArticle && isFullReadingMode}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsFullReadingMode(false)}
      >
        {selectedArticle && (
          <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: STATUSBAR_HEIGHT + 4 }}>
            {/* Header with Back Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? '#2B2B2B' : '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.cardBorder }}
                onPress={() => setIsFullReadingMode(false)}
              >
                <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 14, fontWeight: '900', color: theme.textPrimary }}>Clinical Education</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
              {selectedArticle.thumbnail && (
                <View style={{ width: '100%', height: 210, borderRadius: 20, overflow: 'hidden', marginBottom: 18 }}>
                  <Image
                    source={{ uri: selectedArticle.thumbnail }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              )}

              <Text style={{ fontSize: 22, fontWeight: '900', color: theme.textPrimary, lineHeight: 28, marginBottom: 6 }}>
                {selectedArticle.title}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '600', marginBottom: 12 }}>
                {selectedArticle.readTime} • {selectedArticle.author}
              </Text>

              <View style={{ height: 1, backgroundColor: theme.divider, marginVertical: 12 }} />

              <Text style={{ fontSize: 14, color: theme.textPrimary, lineHeight: 22, marginBottom: 16 }}>
                {selectedArticle.fullText}
              </Text>

              <Text style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 22, marginBottom: 24 }}>
                Consistency in learning about your reproductive wellness empowers informed health decisions and personalized care throughout each phase of life.
              </Text>

              {/* Ask Dr. Red AI about this article */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#584988',
                  paddingVertical: 14,
                  borderRadius: 18,
                  shadowColor: '#584988',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                  elevation: 2,
                }}
                onPress={() => {
                  const title = selectedArticle.title;
                  setIsFullReadingMode(false);
                  setSelectedArticle(null);
                  if (navigation?.navigate) {
                    navigation.navigate('AICompanion', {
                      initialQuery: `Hi Dr. Red, I was reading your article "${title}". Can you give me more insights on how this relates to my health?`,
                      autoSend: true,
                      timestamp: Date.now(),
                    });
                  }
                }}
              >
                <Ionicons name="sparkles" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Ask Dr. Red about this</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}
