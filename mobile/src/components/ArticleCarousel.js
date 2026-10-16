import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  useWindowDimensions,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const CARD_SPACING = 14;

export const DEFAULT_PREGNANCY_ARTICLES = [
  {
    id: '1',
    title: "Your Baby's Life in the Womb",
    category: 'FETAL DEVELOPMENT',
    readTime: '4 min read',
    summary: 'Sensory pathways accelerate rapidly at Week 16. Discover how your baby moves, hears ambient sounds, and responds to your voice.',
    icon: 'body-outline',
    iconBg: '#FFEBEE',
    iconColor: '#DC2626',
    fullContent: `At Week 16 of pregnancy, your baby is roughly measuring about 4.5 inches from crown to rump and weighing around 3.5 ounces.\n\nYour baby is actively exploring their environment: flexing tiny limb joints, sucking their thumb, and making gentle facial expressions. The umbilical cord has grown thick and robust to transport nutrients, oxygen, and protective antibodies.\n\nThe heart is pumping approximately 25 quarts of blood daily, and hearing structures are sensitive enough to recognize your heartbeat, voice, and external music.`,
  },
  {
    id: '2',
    title: '7 Tips on How to Snack Healthily During Pregnancy',
    category: 'PRENATAL NUTRITION',
    readTime: '5 min read',
    summary: 'Fuel yourself and your growing baby with sustained-energy foods rich in calcium, protein, and complex carbs while curbing morning nausea.',
    icon: 'restaurant-outline',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    fullContent: `1. Pair Complex Carbs with Protein: Combine apple slices with almond butter or Greek yogurt with berries for sustained blood sugar stability.\n\n2. Keep Calcium-Rich Snacks Handy: Fortified plant milk smoothies, cheese sticks, or kale chips support fetal skeleton growth.\n\n3. Hydrate Constantly: Dehydration can trigger false Braxton-Hicks contractions. Drink 8-10 glasses of water daily.\n\n4. Choose Fiber to Ease Constipation: Prunes, chia seed puddings, and whole-grain toast help digestion.\n\n5. Portion Nuts & Seeds: Walnuts and pumpkin seeds supply vital Omega-3 fatty acids for fetal brain development.\n\n6. Manage Nausea with Ginger: Ginger tea or dry whole-grain crackers settle morning sickness.\n\n7. Avoid Unpasteurized Dairy & Raw Seafood: Ensure all cheeses, milk, and eggs are thoroughly pasteurized to protect against listeria.`,
  },
  {
    id: '3',
    title: 'Navigating the Second Trimester Vitality',
    category: 'MATERNAL WELLNESS',
    readTime: '4 min read',
    summary: 'The second trimester often brings renewed energy and glowing vitality. Here is how to maintain safe posture, light fitness, and emotional balance.',
    icon: 'sparkles-outline',
    iconBg: '#E0F2FE',
    iconColor: '#0284C7',
    fullContent: `Often called the "honeymoon phase" of pregnancy, weeks 14 to 27 are marked by decreased morning sickness and a surge in vitality.\n\nKey Recommendations:\n- Gentle Daily Movement: 20-30 minutes of prenatal yoga, brisk walking, or swimming relieves lower back strain.\n- Sleep Position: Transitioning to sleeping on your left side optimizes blood flow through the inferior vena cava to the placenta.\n- Pelvic Floor Health: Daily Kegel exercises and pelvic tilts support your bladder and prepare pelvic tissues for birth.\n- Skin Care: Gentle hydration with natural oils or fragrance-free moisturizers eases stretching abdomen skin.`,
  },
  {
    id: '4',
    title: 'Essential Nutrients: Iron, Calcium & Omega-3 DHA',
    category: 'VITAL NUTRIENTS',
    readTime: '3 min read',
    summary: 'Critical building blocks for fetal neural pathways and maternal red blood cell production. Tips on maximizing absorption without stomach upset.',
    icon: 'nutrition-outline',
    iconBg: '#DCFCE7',
    iconColor: '#15803D',
    fullContent: `Your blood volume expands by up to 50% during pregnancy, making key micro-nutrients indispensable.\n\n- Iron: Essential to prevent maternal anemia and supply oxygen to fetal organs. Pair plant-based iron with Vitamin C (like oranges or bell peppers) to double absorption.\n- Calcium: Baby absorbs calcium directly for skeletal mineralization. If dietary intake is low, the body draws from maternal stores, so ensure 1000-1200mg daily.\n- Omega-3 DHA: Supports rapid brain and retina development during the second and third trimesters. Choose purified fish oil or algae-based DHA supplements.`,
  },
];

export default function ArticleCarousel({
  articles = DEFAULT_PREGNANCY_ARTICLES,
  onSelectArticle,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(windowWidth - 56, 420);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (cardWidth + CARD_SPACING));
    if (index >= 0 && index < articles.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const renderCard = ({ item }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.cardContainer, { width: cardWidth }]}
        onPress={() => onSelectArticle && onSelectArticle(item)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.categoryBadge, { backgroundColor: item.iconBg }]}>
            <Text style={[styles.categoryBadgeText, { color: item.iconColor }]}>
              {item.category}
            </Text>
          </View>
          <View style={styles.readTimeRow}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
            <Text style={styles.readTimeText}>{item.readTime}</Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.cardSummary} numberOfLines={3}>
          {item.summary}
        </Text>

        <View style={styles.cardFooterRow}>
          <View style={[styles.cardIconCircle, { backgroundColor: item.iconBg }]}>
            <Ionicons name={item.icon} size={20} color={item.iconColor} />
          </View>

          <View style={styles.readPill}>
            <Text style={styles.readPillText}>Read Insight</Text>
            <Ionicons name="arrow-forward" size={13} color="#DC2626" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + CARD_SPACING}
        snapToAlignment="start"
        decelerationRate="fast"
        nestedScrollEnabled={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.flatListContent}
      />

      {/* Pagination Indicator Dots */}
      <View style={styles.paginationRow}>
        {articles.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <View
              key={item.id}
              style={[
                styles.dot,
                isActive ? styles.dotActive : styles.dotInactive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: CARD_SPACING,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
    minHeight: 180,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  readTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readTimeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 6,
  },
  cardSummary: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  readPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: '#DC2626',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#E5E7EB',
  },
});
