import React, { useState, useRef } from 'react';
import {
  Text,
  View,
  useWindowDimensions,
  FlatList,
  TouchableOpacity,
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
        className="bg-white rounded-[22px] p-[18px] border border-gray-200 shadow-sm justify-between min-h-[180px]"
        style={{ width: cardWidth, marginRight: CARD_SPACING }}
        onPress={() => onSelectArticle && onSelectArticle(item)}
      >
        <View className="flex-row items-center justify-between mb-2.5">
          <View className="px-2.5 py-1 rounded-[10px]" style={{ backgroundColor: item.iconBg }}>
            <Text className="text-[10px] font-extrabold tracking-wider" style={{ color: item.iconColor }}>
              {item.category}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={12} color="#9CA3AF" style={{ marginRight: 3 }} />
            <Text className="text-[11px] text-gray-400 font-semibold">{item.readTime}</Text>
          </View>
        </View>

        <Text className="text-base font-extrabold text-gray-900 leading-[22px] mb-1.5" numberOfLines={2}>
          {item.title}
        </Text>

        <Text className="text-[13px] text-gray-600 leading-[19px] mb-3.5" numberOfLines={3}>
          {item.summary}
        </Text>

        <View className="flex-row items-center justify-between border-t border-gray-100 pt-3">
          <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: item.iconBg }}>
            <Ionicons name={item.icon} size={20} color={item.iconColor} />
          </View>

          <View className="flex-row items-center bg-red-50 px-3 py-1.5 rounded-[14px]">
            <Text className="text-xs font-extrabold text-red-600 mr-1">Read Insight</Text>
            <Ionicons name="arrow-forward" size={13} color="#DC2626" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="mb-2">
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}
      />

      {/* Pagination Indicator Dots */}
      <View className="flex-row items-center justify-center mt-3 space-x-1.5">
        {articles.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <View
              key={item.id}
              className={`h-1.5 rounded-[3px] ${
                isActive ? 'w-[22px] bg-red-600' : 'w-1.5 bg-gray-200'
              }`}
            />
          );
        })}
      </View>
    </View>
  );
}
