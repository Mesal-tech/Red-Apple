import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function EducationFeatureCard({
  title,
  summary,
  bullets = [],
  actionLabel = 'Read insight',
  icon = 'sparkles-outline',
  onPress,
  theme,
  isDarkMode,
}) {
  const cardColor = isDarkMode ? '#281E2F' : '#80658E';
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${actionLabel}`}
      style={{ minHeight: 194, borderRadius: 28, padding: 22, marginBottom: 20, backgroundColor: cardColor, borderWidth: 1, borderColor: isDarkMode ? '#44374F' : '#80658E', overflow: 'hidden', position: 'relative' }}
    >
      <View pointerEvents="none" style={{ position: 'absolute', right: -15, top: -8, width: 156, height: 156, borderRadius: 78, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 104, height: 104, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '12deg' }] }}>
          <Ionicons name={icon} size={58} color="rgba(255,255,255,0.9)" />
        </View>
      </View>
      <View style={{ width: '72%', zIndex: 1 }}>
        <Text style={{ fontSize: 22, lineHeight: 27, fontWeight: '900', color: '#FFFFFF', marginBottom: 10 }} numberOfLines={2}>{title}</Text>
        {!!summary && <Text style={{ fontSize: 13, lineHeight: 19, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: bullets.length ? 12 : 16 }}>{summary}</Text>}
        {bullets.slice(0, 3).map((bullet, index) => (
          <View key={`${index}-${bullet}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
              <Ionicons name={['checkmark', 'leaf-outline', 'heart-outline'][index]} size={12} color="#FFFFFF" />
            </View>
            <Text style={{ flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={2}>{bullet}</Text>
          </View>
        ))}
        <View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 10, marginTop: bullets.length ? 3 : 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#1F2937' }}>{actionLabel}</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', right: 14, bottom: 14, width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.72)' }} />
    </TouchableOpacity>
  );
}

export function EducationArticleRail({
  title = 'Explore topics',
  articles = [],
  onSelectArticle,
  onSeeAll,
  theme,
  isDarkMode,
}) {
  const { width: viewportWidth } = useWindowDimensions();
  const isWide = viewportWidth >= 1100;
  if (!articles.length) return null;
  const renderArticle = (article) => (
    <TouchableOpacity
      key={article.id}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${article.title}, ${article.readTime || 'Read insight'}`}
      style={{ width: isWide ? undefined : 164, flexGrow: isWide ? 1 : 0, flexBasis: isWide ? '23%' : undefined, maxWidth: isWide ? 320 : undefined, marginRight: isWide ? 0 : 12 }}
      onPress={() => onSelectArticle?.(article)}
    >
      <View style={{ height: 132, borderRadius: 22, backgroundColor: isDarkMode ? theme.card : (article.iconBg || '#F1F3F6'), borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 9 }}>
        <View style={{ position: 'absolute', width: 88, height: 88, borderRadius: 44, backgroundColor: isDarkMode ? '#302428' : '#FFFFFF88', top: 12, right: 10 }} />
        <View style={{ width: 66, height: 66, borderRadius: 23, backgroundColor: isDarkMode ? '#3A2529' : '#FFFFFF', borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] }}>
          <Ionicons name={article.icon || 'book-outline'} size={32} color={isDarkMode ? colors.primary : (article.iconColor || colors.primary)} />
        </View>
        <View style={{ position: 'absolute', left: 13, bottom: 15, width: 28, height: 6, borderRadius: 3, backgroundColor: isDarkMode ? '#534248' : '#FFFFFF' }} />
        <View style={{ position: 'absolute', right: 17, bottom: 19, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }} />
      </View>
      <Text style={{ fontSize: 9, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase', color: isDarkMode ? colors.primary : (article.iconColor || colors.primary), marginBottom: 3 }} numberOfLines={1}>{article.category || 'WELLNESS'}</Text>
      <Text style={{ fontSize: 14, lineHeight: 18, fontWeight: '800', color: theme.textPrimary }} numberOfLines={2}>{article.title}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginTop: 3 }}>{article.readTime || '4 min read'}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: theme.textPrimary }}>{title}</Text>
        {onSeeAll ? (
          <TouchableOpacity onPress={onSeeAll} accessibilityRole="button">
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>See all</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {isWide ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{articles.map(renderArticle)}</View>
      ) : (
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>{articles.map(renderArticle)}</ScrollView>
      )}
    </View>
  );
}

/**
 * Presentation layer for algorithm-selected education content.
 * Callers own stage rules, ranking, and personalization, and pass the selected
 * feature/article model through `content` without coupling those rules to UI.
 */
export default function StageEducationSection({ content, onSelectArticle, onSeeAll, theme, isDarkMode }) {
  const feature = content?.feature;
  const articles = Array.isArray(content?.articles) ? content.articles : [];
  if (!feature && !articles.length) return null;
  return (
    <View style={{ marginBottom: 20 }}>
      {feature ? <EducationFeatureCard {...feature} theme={theme} isDarkMode={isDarkMode} onPress={() => onSelectArticle?.(feature.article || feature)} /> : null}
      <EducationArticleRail title={feature?.railTitle || 'Explore topics'} articles={articles} onSelectArticle={onSelectArticle} onSeeAll={onSeeAll} theme={theme} isDarkMode={isDarkMode} />
    </View>
  );
}
