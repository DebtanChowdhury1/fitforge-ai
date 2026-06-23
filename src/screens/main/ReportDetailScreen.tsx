import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, Animated, Easing,
  StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, Download, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { GradientBackground } from '../../components/GradientBackground';
import { FadeIn } from '../../components/FadeIn';
import { PulseView } from '../../components/PulseView';
import { ProgressStackParamList, ReportSection } from '../../types';

type Props = NativeStackScreenProps<ProgressStackParamList, 'ReportDetail'>;
const { width: W } = Dimensions.get('window');

// ── Section config ────────────────────────────────────────────────────────────

interface SectionConfig {
  emoji: string;
  accent: string;
  bg: [string, string];
}

const SECTION_CONFIG: Record<string, SectionConfig> = {
  executive: { emoji: '🎯', accent: '#FF6B35', bg: ['#FF6B3514', '#FF6B3504'] },
  work:      { emoji: '💪', accent: '#00d4ff', bg: ['#00d4ff14', '#00d4ff04'] },
  numbers:   { emoji: '📊', accent: '#bf5af2', bg: ['#bf5af214', '#bf5af204'] },
  momentum:  { emoji: '🔥', accent: '#ff8c00', bg: ['#ff8c0014', '#ff8c0004'] },
  gaps:      { emoji: '⚡', accent: '#ff2d55', bg: ['#ff2d5514', '#ff2d5504'] },
  recovery:  { emoji: '🌙', accent: '#5e5ce6', bg: ['#5e5ce614', '#5e5ce604'] },
  nextweek:  { emoji: '📅', accent: '#34d399', bg: ['#34d39914', '#34d39904'] },
  coach:     { emoji: '🤝', accent: '#bf5af2', bg: ['#bf5af214', '#bf5af204'] },
  // legacy
  summary:   { emoji: '🎯', accent: '#FF6B35', bg: ['#FF6B3514', '#FF6B3504'] },
  week:      { emoji: '📅', accent: '#bf5af2', bg: ['#bf5af214', '#bf5af204'] },
  trends:    { emoji: '📈', accent: '#00d4ff', bg: ['#00d4ff14', '#00d4ff04'] },
  upcoming:  { emoji: '🚀', accent: '#34d399', bg: ['#34d39914', '#34d39904'] },
  note:      { emoji: '🤝', accent: '#ff8c00', bg: ['#ff8c0014', '#ff8c0004'] },
};

// ── Animated entrance per card ────────────────────────────────────────────────

function AnimatedCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const translateY = useRef(new Animated.Value(28)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 80, friction: 9, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      {children}
    </Animated.View>
  );
}

// ── Section illustration header ───────────────────────────────────────────────

function SectionIllustration({ cfg, title, index }: { cfg: SectionConfig; title: string; index: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 2800 + index * 200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.94, duration: 2800 + index * 200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: -6, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 6, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={ss.illustrationWrap}>
      {/* Deep gradient background */}
      <LinearGradient
        colors={[cfg.accent + '55', cfg.accent + '22', '#09090e']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
      />
      {/* Decorative orbs */}
      <View style={[ss.illOrb1, { backgroundColor: cfg.accent + '30' }]} />
      <View style={[ss.illOrb2, { backgroundColor: cfg.accent + '14' }]} />

      {/* Scan shimmer over illustration */}
      <SectionShimmer color={cfg.accent} delay={300 + index * 80} />

      {/* Floating animated emoji */}
      <Animated.Text style={[ss.illEmoji, { transform: [{ scale: pulse }, { translateY: drift }] }]}>
        {cfg.emoji}
      </Animated.Text>

      {/* Title overlay */}
      <View style={ss.illTitleRow}>
        <Text style={[ss.illSection, { color: cfg.accent }]}>Section {index + 1}</Text>
        <Text style={ss.illTitle} numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ section, index }: { section: ReportSection; index: number }) {
  const cfg = SECTION_CONFIG[section.id] ?? SECTION_CONFIG.executive;
  const paragraphs = section.content.split(/\n\n+/).filter(Boolean);

  return (
    <AnimatedCard delay={100 + index * 75}>
      <View style={ss.card}>
        {/* Tinted gradient background */}
        <LinearGradient
          colors={cfg.bg as [string, string]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />

        {/* ── Magazine-style illustration header ── */}
        <SectionIllustration cfg={cfg} title={section.title} index={index} />

        {/* Section label row below illustration */}
        <View style={ss.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[ss.cardTitle, { color: cfg.accent }]}>
              {section.title.toUpperCase()}
            </Text>
            <Text style={ss.cardSectionNum}>ForgeAI analysis · personalised</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[ss.cardDivider, { backgroundColor: cfg.accent + '20' }]} />

        {/* Paragraph content */}
        <View style={ss.cardBody}>
          {paragraphs.map((para, i) => (
            <Text key={i} style={[ss.cardParagraph, i < paragraphs.length - 1 && ss.paraGap]}>
              {para.trim()}
            </Text>
          ))}
        </View>
      </View>
    </AnimatedCard>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({
  emoji, label, value, color,
}: { emoji: string; label: string; value: string; color: string }) {
  return (
    <View style={[ss.statChip, { borderColor: color + '35', backgroundColor: color + '12' }]}>
      <Text style={ss.statChipEmoji}>{emoji}</Text>
      <Text style={[ss.statChipValue, { color }]}>{value}</Text>
      <Text style={ss.statChipLabel}>{label}</Text>
    </View>
  );
}

// ── Floating particles (hero background decoration) ───────────────────────────

interface Particle { x: number; y: number; size: number; speed: number; opacity: number }

function FloatingParticles({ color }: { color: string }) {
  const PARTICLES: Particle[] = [
    { x: 0.12, y: 0.9, size: 3, speed: 8000,  opacity: 0.5 },
    { x: 0.3,  y: 0.8, size: 2, speed: 12000, opacity: 0.35 },
    { x: 0.55, y: 0.95, size: 4, speed: 9500, opacity: 0.45 },
    { x: 0.75, y: 0.85, size: 2, speed: 11000, opacity: 0.3 },
    { x: 0.88, y: 0.92, size: 3, speed: 7500,  opacity: 0.4 },
    { x: 0.2,  y: 0.7, size: 2, speed: 14000, opacity: 0.25 },
    { x: 0.65, y: 0.75, size: 3, speed: 10000, opacity: 0.35 },
    { x: 0.45, y: 0.88, size: 2, speed: 13000, opacity: 0.28 },
  ];

  const anims = useRef(PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    PARTICLES.forEach((p, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anims[i], {
            toValue: 1, duration: p.speed + i * 300,
            easing: Easing.linear, useNativeDriver: true,
          }),
        ]),
      );
      setTimeout(() => loop.start(), i * 600);
      return () => loop.stop();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {PARTICLES.map((p, i) => {
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(180 + p.size * 20)],
        });
        const opacity = anims[i].interpolate({
          inputRange: [0, 0.15, 0.8, 1],
          outputRange: [0, p.opacity, p.opacity * 0.7, 0],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x * 100}%` as any,
              top: `${p.y * 100}%` as any,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: color,
              opacity,
              transform: [{ translateY }],
            }}
          />
        );
      })}
    </View>
  );
}

// ── Section shimmer scan line ─────────────────────────────────────────────────

function SectionShimmer({ color, delay }: { color: string; delay: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay(3000),
          Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-W, W],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute', top: 0, bottom: 0, width: 60,
        transform: [{ translateX }],
      }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', color + '18', color + '28', color + '18', 'transparent']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      />
    </Animated.View>
  );
}

// ── PDF HTML ──────────────────────────────────────────────────────────────────

function buildPdfHtml(title: string, createdAt: string, sections: ReportSection[]): string {
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const accentMap: Record<string, string> = {
    executive: '#E55A2B', work: '#0099BB', numbers: '#8A3FBB',
    momentum: '#CC6600', gaps: '#CC2244', recovery: '#3D3DAE',
    nextweek: '#1A9E6E', coach: '#8A3FBB',
  };
  const emojiMap: Record<string, string> = {
    executive: '🎯', work: '💪', numbers: '📊', momentum: '🔥',
    gaps: '⚡', recovery: '🌙', nextweek: '📅', coach: '🤝',
  };
  const sectionHtml = sections.map((s) => {
    const color = accentMap[s.id] ?? '#E55A2B';
    const emoji = emojiMap[s.id] ?? '📌';
    const paragraphs = s.content.split(/\n\n+/).filter(Boolean)
      .map((p) => `<p>${p.trim()}</p>`).join('');
    return `
      <div class="section">
        <div class="section-header" style="border-left:4px solid ${color}; background:${color}12;">
          <span class="section-emoji">${emoji}</span>
          <span class="section-label" style="color:${color};">${s.title.toUpperCase()}</span>
        </div>
        <div class="section-content">${paragraphs}</div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#fff;color:#1a1a2e;padding:48px 52px;line-height:1.7;}
  .header{margin-bottom:40px;padding-bottom:28px;border-bottom:2px solid #f0f0f0;}
  .brand{font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#E55A2B;margin-bottom:14px;}
  .report-title{font-size:28px;font-weight:900;color:#0d0d1a;letter-spacing:-0.5px;line-height:1.2;margin-bottom:12px;}
  .report-meta{font-size:13px;color:#666;}
  .section{margin-bottom:36px;page-break-inside:avoid;}
  .section-header{display:flex;align-items:center;gap:12px;padding:10px 14px;margin-bottom:16px;border-radius:0 8px 8px 0;}
  .section-emoji{font-size:20px;}
  .section-label{font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;}
  .section-content p{font-size:14.5px;color:#2a2a3a;line-height:1.8;margin-bottom:16px;}
  .section-content p:last-child{margin-bottom:0;}
  .footer{margin-top:52px;padding-top:20px;border-top:1px solid #eee;font-size:11px;color:#aaa;display:flex;justify-content:space-between;}
  .footer-brand{font-weight:700;color:#E55A2B;}
</style>
</head>
<body>
  <div class="header">
    <div class="brand">FitForge AI — Performance Report</div>
    <div class="report-title">${title}</div>
    <div class="report-meta">Generated ${date} · ForgeAI Coach</div>
  </div>
  ${sectionHtml}
  <div class="footer">
    <span>FitForge AI — Your personal coaching intelligence</span>
    <span class="footer-brand">ForgeAI</span>
  </div>
</body>
</html>`;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ReportDetailScreen({ route, navigation }: Props) {
  const { report } = route.params;
  const [downloading, setDownloading] = useState(false);

  // Hero entrance
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroScale   = useRef(new Animated.Value(0.9)).current;
  const heroY       = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
      Animated.spring(heroY, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const sections = report.content?.sections ?? [];

  const expiresIn = Math.max(0, Math.ceil(
    (new Date(report.expires_at).getTime() - Date.now()) / 86400000,
  ));
  const formattedDate = new Date(report.created_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const reportEmoji = report.type === 'daily' ? '📋' : '📊';
  const reportTypeLabel = report.type === 'daily' ? 'Daily Report' : 'Custom Report';
  const reportTypeColor = report.type === 'daily' ? '#FF6B35' : '#bf5af2';

  async function downloadPdf() {
    setDownloading(true);
    try {
      const html = buildPdfHtml(report.title, report.created_at, sections);
      const { uri } = await Print.printToFileAsync({ html });

      const dir = (FileSystem.documentDirectory ?? '') + 'FitForge/Reports/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const safeTitle = report.title.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_').slice(0, 36);
      const savedUri  = `${dir}${safeTitle}_${Date.now()}.pdf`;
      await FileSystem.copyAsync({ from: uri, to: savedUri });

      Alert.alert(
        'Downloaded',
        `Saved to Files  >  On My iPhone  >  FitForge  >  Reports`,
        [{ text: 'OK' }],
      );
    } catch (err: any) {
      Alert.alert('Download failed', err?.message ?? 'Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <GradientBackground variant="progress" />
      <View style={StyleSheet.absoluteFillObject}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>

          {/* ── Header bar ── */}
          <FadeIn delay={0} fromY={-8}>
            <View style={ss.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={ss.iconBtn}
              >
                <ChevronLeft size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>

              <View style={[ss.typeBadge, { borderColor: reportTypeColor + '45' }]}>
                <Text style={ss.typeBadgeEmoji}>{reportEmoji}</Text>
                <Text style={[ss.typeBadgeText, { color: reportTypeColor }]}>{reportTypeLabel}</Text>
              </View>

              <TouchableOpacity
                onPress={downloadPdf}
                disabled={downloading}
                style={ss.iconBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {downloading
                  ? <ActivityIndicator size="small" color="#FF6B35" />
                  : <Download size={18} color="#FF6B35" />}
              </TouchableOpacity>
            </View>
          </FadeIn>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>

            {/* ── Animated hero card ── */}
            <Animated.View style={{
              opacity: heroOpacity,
              transform: [{ scale: heroScale }, { translateY: heroY }],
              marginBottom: 8,
            }}>
              <View style={ss.hero}>
                {/* Gradient bg */}
                <LinearGradient
                  colors={['#1e0a00', '#140a1e', '#0a0a14']}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />

                {/* Orb decorations */}
                <View style={[ss.heroOrb1, { backgroundColor: reportTypeColor + '22' }]} />
                <View style={ss.heroOrb2} />

                {/* Floating particles drifting upward */}
                <FloatingParticles color={reportTypeColor} />

                {/* Pulsing emoji icon */}
                <PulseView minScale={0.94} maxScale={1.06} duration={2600} style={{ zIndex: 1 }}>
                  <View style={[ss.heroEmojiWrap, { borderColor: reportTypeColor + '35', backgroundColor: reportTypeColor + '15' }]}>
                    <Text style={ss.heroEmoji}>{reportEmoji}</Text>
                  </View>
                </PulseView>

                <Text style={ss.heroTitle}>{report.title}</Text>

                <View style={ss.heroMeta}>
                  <Calendar size={11} color="rgba(255,255,255,0.3)" />
                  <Text style={ss.heroMetaText}>{formattedDate}</Text>
                </View>

                {/* Stat chips */}
                <View style={ss.statRow}>
                  <StatChip
                    emoji="📌"
                    label="Insights"
                    value={`${sections.length}`}
                    color="#FF6B35"
                  />
                  <StatChip
                    emoji={expiresIn <= 1 ? '⏰' : '📆'}
                    label={expiresIn === 0 ? 'Expires today' : `${expiresIn}d left`}
                    value={expiresIn === 0 ? '!' : `${expiresIn}d`}
                    color={expiresIn <= 1 ? '#ff2d55' : '#34d399'}
                  />
                  <StatChip
                    emoji="🤖"
                    label="By"
                    value="ForgeAI"
                    color="#bf5af2"
                  />
                </View>

                {/* Bottom badge */}
                <View style={ss.coachBadge}>
                  <Text style={ss.coachBadgeEmoji}>✨</Text>
                  <Text style={ss.coachBadgeText}>
                    AI-generated · personalised to your training data
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* ── Section legend row ── */}
            <FadeIn delay={60} fromY={6}>
              <View style={ss.legend}>
                <Text style={ss.legendText}>
                  {sections.length} coaching sections below — scroll to read each one
                </Text>
              </View>
            </FadeIn>

            {/* ── Emoji section previews row ── */}
            <FadeIn delay={80} fromY={6}>
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={ss.emojiPreviewRow}
              >
                {sections.map((s, i) => {
                  const cfg = SECTION_CONFIG[s.id] ?? SECTION_CONFIG.executive;
                  return (
                    <View key={s.id} style={[ss.emojiPreview, { borderColor: cfg.accent + '40', backgroundColor: cfg.accent + '12' }]}>
                      <Text style={ss.emojiPreviewIcon}>{cfg.emoji}</Text>
                      <Text style={[ss.emojiPreviewNum, { color: cfg.accent }]}>{i + 1}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </FadeIn>

            {/* ── Section cards ── */}
            <View style={ss.sectionList}>
              {sections.map((section, i) => (
                <SectionCard key={section.id} section={section} index={i} />
              ))}
            </View>

            {/* ── Download CTA ── */}
            <AnimatedCard delay={sections.length * 75 + 140}>
              <TouchableOpacity
                onPress={downloadPdf}
                disabled={downloading}
                activeOpacity={0.82}
              >
                <LinearGradient
                  colors={['rgba(255,107,53,0.16)', 'rgba(191,90,242,0.1)', 'rgba(0,212,255,0.08)']}
                  style={ss.downloadCta}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <View style={[ss.downloadCtaIcon, { backgroundColor: downloading ? 'rgba(255,255,255,0.06)' : 'rgba(255,107,53,0.18)' }]}>
                    {downloading
                      ? <ActivityIndicator size="small" color="#FF6B35" />
                      : <Text style={{ fontSize: 22 }}>📥</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ss.downloadCtaTitle}>
                      {downloading ? 'Generating PDF...' : 'Download as PDF'}
                    </Text>
                    <Text style={ss.downloadCtaSub}>Save your full coaching report to Files</Text>
                  </View>
                  <Download size={16} color="rgba(255,107,53,0.6)" />
                </LinearGradient>
              </TouchableOpacity>
            </AnimatedCard>

          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  typeBadgeEmoji: { fontSize: 13 },
  typeBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 12 },

  // Hero
  hero: {
    borderRadius: 28, padding: 26, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)', overflow: 'hidden',
  },
  heroOrb1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    top: -80, right: -50,
  },
  heroOrb2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(94,92,230,0.12)',
    bottom: -50, left: -30,
  },
  heroEmojiWrap: {
    width: 84, height: 84, borderRadius: 24,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  heroEmoji: { fontSize: 40 },
  heroTitle: {
    color: '#fff', fontSize: 19, fontWeight: '900',
    textAlign: 'center', letterSpacing: -0.3, lineHeight: 25,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },

  statRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  statChip: {
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center', gap: 2, flex: 1,
  },
  statChipEmoji: { fontSize: 16, marginBottom: 1 },
  statChipValue: { fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  statChipLabel: { color: 'rgba(255,255,255,0.32)', fontSize: 9, fontWeight: '700', textAlign: 'center' },

  coachBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginTop: 2,
  },
  coachBadgeEmoji: { fontSize: 13 },
  coachBadgeText: { color: 'rgba(255,255,255,0.42)', fontSize: 11.5, fontWeight: '600' },

  legend: { alignItems: 'center' },
  legendText: { color: 'rgba(255,255,255,0.2)', fontSize: 12 },

  emojiPreviewRow: { gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  emojiPreview: {
    width: 48, height: 56, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  emojiPreviewIcon: { fontSize: 20 },
  emojiPreviewNum: { fontSize: 9, fontWeight: '900' },

  sectionList: { gap: 12 },

  // Section card
  card: {
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTopBar: { height: 3, width: '100%' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
  },
  emojiWrap: {
    width: 42, height: 42, borderRadius: 13,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  emojiText: { fontSize: 20 },
  cardTitle: {
    fontSize: 10, fontWeight: '800', letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardSectionNum: { color: 'rgba(255,255,255,0.22)', fontSize: 10, marginTop: 2 },
  cardDivider: { height: 1, marginHorizontal: 18 },
  cardBody: { padding: 18, paddingTop: 14 },
  cardParagraph: { color: 'rgba(255,255,255,0.78)', fontSize: 14.5, lineHeight: 24.5 },
  paraGap: { marginBottom: 16 },

  // Illustration header
  illustrationWrap: {
    height: 156, overflow: 'hidden',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  illOrb1: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    top: -40, right: -30,
  },
  illOrb2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    bottom: -30, left: -20,
  },
  illEmoji: { fontSize: 60, textAlign: 'center', marginBottom: 6 },
  illTitleRow: { alignItems: 'center', gap: 2 },
  illSection: { fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  illTitle: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600' },

  // Download CTA
  downloadCta: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,107,53,0.22)',
  },
  downloadCtaIcon: {
    width: 48, height: 48, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  downloadCtaTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  downloadCtaSub: { color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 2 },
});
