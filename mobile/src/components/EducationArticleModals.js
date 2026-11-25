import React, { useMemo } from 'react';
import {
  Image,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppBottomSheet from './AppBottomSheet';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

function getArticleParagraphs(article) {
  const fullText = article?.fullText;
  const rawContent = fullText && fullText !== article?.summary
    ? fullText
    : article?.content || article?.fullContent || '';
  const text = String(rawContent)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .trim();
  return text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export default function EducationArticleModals({
  article,
  isReading,
  onReadFull,
  onClosePreview,
  onCloseReader,
  onAskDrRed,
}) {
  const { width } = useWindowDimensions();
  const { isDarkMode, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isWide = width >= 820;
  const paragraphs = useMemo(() => getArticleParagraphs(article), [article]);
  const takeaways = article?.bulletPoints || article?.bullets || [];
  const byline = article?.author || 'Red Apple Clinical Education';

  const readButton = (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onReadFull}
      style={{ minHeight: 54, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
    >
      <Ionicons name="book-outline" size={18} color="#FFFFFF" style={{ marginRight: 9 }} />
      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Read full article</Text>
      <Ionicons name="arrow-forward" size={17} color="#FFFFFF" style={{ marginLeft: 9 }} />
    </TouchableOpacity>
  );

  return (
    <>
      <AppBottomSheet
        visible={Boolean(article) && !isReading}
        onClose={onClosePreview}
        showHandle
        maxHeight="88%"
        avoidKeyboard={false}
        footer={readButton}
        footerStyle={{ backgroundColor: theme.card, borderColor: theme.cardBorder, paddingTop: 12 }}
      >
        <View style={{ paddingHorizontal: 22, paddingBottom: 20 }}>
          {article?.thumbnail ? (
            <View style={{ height: isWide ? 210 : 165, borderRadius: 20, overflow: 'hidden', marginBottom: 18, backgroundColor: theme.subtleSurface }}>
              <Image source={{ uri: article.thumbnail }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <View style={{ position: 'absolute', left: 12, bottom: 12, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: 'rgba(20,24,23,0.76)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>{article?.category || 'WELLNESS'}</Text>
              </View>
            </View>
          ) : null}

          <Text style={{ color: theme.textPrimary, fontSize: 23, lineHeight: 29, fontWeight: '900', letterSpacing: -0.4 }}>
            {article?.title}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 9, marginBottom: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '700' }}>{article?.readTime || '4 min read'}</Text>
            </View>
            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: theme.textMuted }} />
            <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', flexShrink: 1 }}>{byline}</Text>
          </View>

          <View style={{ height: 1, backgroundColor: theme.divider, marginBottom: 16 }} />
          <Text style={{ color: theme.textPrimary, fontSize: 15, lineHeight: 23, marginBottom: takeaways.length ? 18 : 2 }}>
            {article?.summary}
          </Text>

          {takeaways.length > 0 ? (
            <View style={{ backgroundColor: theme.subtleSurface, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 18, padding: 16, marginTop: 4 }}>
              <Text style={{ color: theme.textPrimary, fontSize: 12, fontWeight: '900', letterSpacing: 0.9, marginBottom: 13 }}>IN THIS ARTICLE</Text>
              {takeaways.map((point, index) => (
                <View key={`${index}-${point}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: index === takeaways.length - 1 ? 0 : 11 }}>
                  <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: isDarkMode ? 'rgba(220,60,56,0.16)' : '#FDECEC', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 }}>
                    <Ionicons name="checkmark" size={13} color={colors.primary} />
                  </View>
                  <Text style={{ flex: 1, color: theme.textSecondary, fontSize: 13, lineHeight: 19, fontWeight: '600' }}>{point}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </AppBottomSheet>

      <Modal
        visible={Boolean(article) && isReading}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onCloseReader}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />
          <View style={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: isWide ? 32 : 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, backgroundColor: theme.background }}>
            <View style={{ width: '100%', maxWidth: 980, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Back to article preview"
                onPress={onCloseReader}
                style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="arrow-back" size={19} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 }}>Clinical education</Text>
              <View style={{ width: 42 }} />
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: isWide ? 32 : 20, paddingTop: 22, paddingBottom: Math.max(insets.bottom, 24) + 28 }}>
            <View style={{ width: '100%', maxWidth: 860, alignSelf: 'center' }}>
              {article?.thumbnail ? (
                <View style={{ width: '100%', height: isWide ? 300 : 205, borderRadius: 24, overflow: 'hidden', marginBottom: 25, backgroundColor: theme.subtleSurface }}>
                  <Image source={{ uri: article.thumbnail }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ) : null}

              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 10 }}>
                {(article?.category || 'WELLNESS').toUpperCase()}
              </Text>
              <Text style={{ color: theme.textPrimary, fontSize: isWide ? 36 : 29, lineHeight: isWide ? 43 : 36, fontWeight: '900', letterSpacing: -0.7 }}>
                {article?.title}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9, marginTop: 13, marginBottom: 22 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: isDarkMode ? '#303936' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="medical-outline" size={16} color={colors.primary} />
                </View>
                <Text style={{ color: theme.textPrimary, fontSize: 12, fontWeight: '700', maxWidth: '70%' }}>{byline}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>·</Text>
                <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{article?.readTime || '4 min read'}</Text>
              </View>

              {article?.summary ? (
                <View style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 16, paddingVertical: 3, marginBottom: 25 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 16, lineHeight: 25, fontWeight: '600' }}>{article.summary}</Text>
                </View>
              ) : null}

              <View style={{ gap: 17 }}>
                {paragraphs.map((paragraph, index) => (
                  <Text key={`paragraph-${index}`} style={{ color: theme.textPrimary, fontSize: 15, lineHeight: 26 }}>
                    {paragraph}
                  </Text>
                ))}
              </View>

              {takeaways.length > 0 ? (
                <View style={{ marginTop: 30, padding: 18, borderRadius: 20, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '900', marginBottom: 15 }}>Key takeaways</Text>
                  {takeaways.map((point, index) => (
                    <View key={`takeaway-${index}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: index === takeaways.length - 1 ? 0 : 13 }}>
                      <Ionicons name="checkmark-circle" size={19} color={colors.primary} style={{ marginRight: 10, marginTop: 2 }} />
                      <Text style={{ flex: 1, color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>{point}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {article?.sourceUrl ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(article.sourceUrl)}
                  style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.cardBorder }}
                >
                  <Text style={{ color: colors.primary, fontSize: 13, lineHeight: 19, fontWeight: '700' }}>
                    Further reading: {article.sourceLabel || 'Source'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 18, marginTop: 25 }}>
                This information is for education and does not replace advice from a qualified healthcare professional.
              </Text>
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: isWide ? 32 : 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderTopColor: theme.cardBorder, backgroundColor: theme.background }}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => onAskDrRed?.(article)}
              style={{ width: '100%', maxWidth: 860, alignSelf: 'center', minHeight: 54, borderRadius: 28, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 9 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Ask Dr. Red about this</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
