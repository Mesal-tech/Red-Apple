import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Circle as SvgCircle, Line as SvgLine } from 'react-native-svg';
import { LineChart } from 'react-native-chart-kit';

function mondayFor(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date, options) {
  return date.toLocaleDateString(undefined, options);
}

export default function ProfileHealthChart({ cycleLogs = [], theme, isDarkMode }) {
  const [chartWidth, setChartWidth] = useState(300);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activePointIndex, setActivePointIndex] = useState(null);
  const { labels, weeks, totals } = useMemo(() => {
    const currentMonday = mondayFor(new Date());
    const weekStarts = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(currentMonday);
      date.setDate(date.getDate() - (11 - index) * 7);
      return date;
    });
    const weekly = Array.from({ length: 12 }, () => new Map());
    (cycleLogs || []).forEach((log) => {
      const date = toDate(log.date || log.logged_at || log.created_at);
      if (!date) return;
      const weekStart = mondayFor(date).getTime();
      const weekIndex = weekStarts.findIndex((week) => week.getTime() === weekStart);
      if (weekIndex < 0) return;
      const dateKey = date.toISOString().slice(0, 10);
      const entry = weekly[weekIndex].get(dateKey) || { symptoms: false, period: false };
      entry.symptoms ||= Array.isArray(log.symptoms) && log.symptoms.length > 0;
      entry.period ||= log.isPeriodDay === true
        || (log.isPeriodDay == null && log.flowIntensity && log.flowIntensity !== 'None');
      weekly[weekIndex].set(dateKey, entry);
    });
    const weekData = weekly.map((dates, index) => {
      const entries = [...dates.values()];
      return {
        date: weekStarts[index],
        checkIns: entries.length,
        symptomDays: entries.filter((entry) => entry.symptoms).length,
        periodDays: entries.filter((entry) => entry.period).length,
      };
    });
    const monthLabels = weekStarts.map((date, index) => {
      const next = weekStarts[index + 1];
      return !next || next.getMonth() !== date.getMonth()
        ? formatDate(date, { month: 'short' }).toUpperCase()
        : '';
    });
    const firstMonthLabel = monthLabels.findIndex(Boolean);
    if (firstMonthLabel >= 0) {
      // Chart Kit centers labels on each point; offset the first label so its
      // visible left edge aligns with the beginning of the plotted line.
      monthLabels[firstMonthLabel] = `\u00a0\u00a0\u00a0\u00a0\u00a0${monthLabels[firstMonthLabel]}`;
    }
    return {
      labels: monthLabels,
      weeks: weekData,
      totals: weekData.reduce((sum, week) => ({
        checkIns: sum.checkIns + week.checkIns,
        symptomDays: sum.symptomDays + week.symptomDays,
        periodDays: sum.periodDays + week.periodDays,
      }), { checkIns: 0, symptomDays: 0, periodDays: 0 }),
    };
  }, [cycleLogs]);

  const cardBackground = isDarkMode ? '#141414' : theme.card;
  const gridColor = isDarkMode ? '#383838' : theme.divider;
  const textColor = theme.textPrimary;
  const mutedColor = theme.textSecondary;
  // Preserve the chart's x-axis label area while reducing the overall plot height by 20%.
  const chartHeight = 126;
  const chartBottomPadding = 24;
  const chartRowHeight = chartHeight + chartBottomPadding;
  const selectedWeekIndex = activePointIndex ?? Math.max(0, weeks.length - 2);
  const selectedWeek = weeks[selectedWeekIndex] || { date: new Date(), checkIns: 0, symptomDays: 0, periodDays: 0 };
  const selectedWeekEnd = new Date(selectedWeek.date);
  selectedWeekEnd.setDate(selectedWeekEnd.getDate() + 6);
  const dateRange = `${formatDate(selectedWeek.date, { month: 'short', day: 'numeric' })} – ${formatDate(selectedWeekEnd, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const allSeries = [
    { key: 'checkIns', label: 'Check-ins', color: '#D84440' },
    { key: 'symptomDays', label: 'Symptom days', color: '#A78BFA' },
    { key: 'periodDays', label: 'Period days', color: '#74C77A' },
  ];
  const visibleSeries = activeFilter === 'all' ? allSeries : allSeries.filter((item) => item.key === 'symptomDays');
  const chartData = {
    labels,
    datasets: visibleSeries.map((series) => ({
      data: weeks.map((week) => week[series.key]),
      color: () => series.color,
      strokeWidth: 3,
    })),
  };
  const peak = Math.max(0, ...visibleSeries.flatMap((series) => weeks.map((week) => week[series.key])));
  const chartMax = Math.max(1, peak);
  const chartConfig = {
    backgroundColor: cardBackground,
    backgroundGradientFrom: cardBackground,
    backgroundGradientTo: cardBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
    labelColor: (opacity = 1) => isDarkMode ? `rgba(179,179,179,${opacity})` : `rgba(100,116,139,${opacity})`,
    propsForBackgroundLines: { stroke: gridColor, strokeWidth: 1 },
    propsForDots: { r: '3.5', strokeWidth: '2', stroke: cardBackground },
  };
  const markerDecorator = ({ width, height, paddingTop = 0, paddingRight = 0, data }) => {
    if (activePointIndex == null) return null;
    const xMax = data.reduce((max, dataset) => Math.max(max, dataset.data.length), 0);
    if (!xMax) return null;
    const x = paddingRight + (activePointIndex * (width - paddingRight)) / xMax;
    const plotBottom = height * 0.75 + paddingTop;
    const combinedValues = data.flatMap((dataset) => dataset.data);
    const maxValue = Math.max(1, ...combinedValues);
    const dots = data.map((dataset, index) => {
      const value = dataset.data[selectedWeekIndex] || 0;
      const y = (((height - (height * value) / maxValue) / 4) * 3) + paddingTop;
      return <SvgCircle key={`selection-dot-${index}`} cx={x} cy={y} r={index === 0 ? 6 : 4} fill={dataset.color?.(1) || '#D84440'} stroke={cardBackground} strokeWidth={2} />;
    });
    return <>
      <SvgLine x1={x} y1={paddingTop} x2={x} y2={plotBottom} stroke={isDarkMode ? '#FFFFFF' : '#64748B'} strokeOpacity={0.85} strokeWidth={1.5} />
      {dots}
    </>;
  };

  const tickTop = chartMax;
  const tickMiddle = chartMax > 1 ? Math.ceil(chartMax / 2) : '';
  const tickLabelStyle = { color: mutedColor, fontSize: 11 };

  return (
    <View style={{ padding: 16, borderRadius: 22, backgroundColor: cardBackground, borderWidth: 1, borderColor: isDarkMode ? '#292929' : theme.cardBorder }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity onPress={() => { setActiveFilter('all'); setActivePointIndex(null); }} accessibilityRole="button" accessibilityState={{ selected: activeFilter === 'all' }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: activeFilter === 'all' ? '#D84440' : (isDarkMode ? '#656565' : '#AAB0B8'), backgroundColor: activeFilter === 'all' ? (isDarkMode ? '#2A1A1A' : '#FCE9E7') : 'transparent' }}>
          <Text style={{ color: activeFilter === 'all' ? '#D84440' : textColor, fontSize: 13, fontWeight: '700' }}>All health</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setActiveFilter('symptoms'); setActivePointIndex(null); }} accessibilityRole="button" accessibilityState={{ selected: activeFilter === 'symptoms' }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: activeFilter === 'symptoms' ? '#D84440' : (isDarkMode ? '#656565' : '#AAB0B8'), backgroundColor: activeFilter === 'symptoms' ? (isDarkMode ? '#2A1A1A' : '#FCE9E7') : 'transparent' }}>
          <Text style={{ color: activeFilter === 'symptoms' ? '#D84440' : textColor, fontSize: 13, fontWeight: '700' }}>Symptoms</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: textColor, fontSize: 19, fontWeight: '800', marginTop: 17, marginLeft: 12 }}>{dateRange}</Text>
      <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 14 }}>
        {[
          { label: 'Check-ins', value: selectedWeek.checkIns },
          { label: 'Symptoms', value: selectedWeek.symptomDays },
          { label: 'Period days', value: selectedWeek.periodDays },
        ].map((metric) => <View key={metric.label} style={{ marginRight: 22 }}>
          <Text style={{ color: mutedColor, fontSize: 12 }}>{metric.label}</Text>
          <Text style={{ color: textColor, fontSize: 19, fontWeight: '800', marginTop: 2 }}>{metric.value}</Text>
        </View>)}
      </View>

      <Text style={{ color: mutedColor, fontSize: 12, marginBottom: 6 }}>Past 12 weeks</Text>
      <View style={{ flexDirection: 'row', alignItems: 'stretch', height: chartRowHeight }}>
        <View style={{ flex: 1, minWidth: 0 }} onLayout={(event) => {
          const nextWidth = Math.floor(event.nativeEvent.layout.width);
          if (nextWidth > 0 && nextWidth !== chartWidth) setChartWidth(nextWidth);
        }}>
          {/* Keep a small inset for month labels while using much less space
              than Chart Kit's 64px default. */}
          <LineChart
            data={chartData}
            width={chartWidth}
            height={chartHeight}
            chartConfig={chartConfig}
            fromZero
            segments={2}
            bezier
            withDots
            withShadow={false}
            withInnerLines
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLabels={false}
            withVerticalLabels
            withLegend={false}
            decorator={markerDecorator}
            onDataPointClick={({ index }) => setActivePointIndex((currentIndex) => currentIndex === index ? null : index)}
            style={{ marginLeft: -13, borderRadius: 12, paddingRight: 20, paddingBottom: chartBottomPadding }}
          />
        </View>
        <View style={{ width: 18, marginLeft: -10, justifyContent: 'space-between', paddingTop: 10, paddingBottom: 39, alignItems: 'flex-end' }}>
          <Text style={tickLabelStyle}>{tickTop}</Text>
          <Text style={tickLabelStyle}>{tickMiddle}</Text>
          <Text style={tickLabelStyle}>0</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 0, paddingTop: 10, borderTopWidth: 1, borderTopColor: gridColor }}>
        {visibleSeries.map((item) => <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: item.color }} /><Text style={{ color: mutedColor, fontSize: 11 }}>{item.label}</Text></View>)}
      </View>
      <Text style={{ color: theme.textMuted, fontSize: 10, lineHeight: 14, marginTop: 7 }}>12-week totals: {totals.checkIns} check-ins · {totals.symptomDays} symptom days · {totals.periodDays} period days</Text>
    </View>
  );
}
