import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/navigation/OilYieldNavigator";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listMaterialBatches,
  updateMaterialBatch,
  type MaterialBatchRead as ApiBatch,
} from "@/services/oilYieldService";
import {
  loadPredictions,
  loadDistillationPredictions,
  loadQualityPredictions,
  savePrediction,
  saveDistillationPrediction,
  saveQualityPrediction,
  type OilYieldPrediction,
  type PredictionsMap,
  type DistillationPrediction,
  type DistillationPredictionsMap,
  type QualityPrediction,
  type QualityPredictionsMap,
} from "@/services/oilYieldPredictionStore";
import apiConfig from "@/config/api";

const API_BASE_URL = Platform.OS === "web"
  ? "http://localhost:8000/api/v1"
  : apiConfig.API_BASE_URL;

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type BatchStatus = "raw" | "drying" | "distilling" | "quality_check" | "complete";
type ModuleType  = "yield-predictor" | "distillation" | "quality" | "price";
type BatchSource = "own_farm" | "purchased";

interface MaterialBatch {
  id: number;
  name: string;
  source: BatchSource;
  rawWeightKg: number;
  driedWeightKg?: number;
  addedDate: string;
  status: BatchStatus;
  plotName?: string;
  moisturePercent?: number;
  expectedYieldPercent?: number;
  cinnamonType?: string;
  plantPart?: string;
  plantAgeYears?: number;
  harvestSeason?: string;
}

// ─── Pipeline Activity ────────────────────────────────────────────────────────

type ActivityKind = "primary" | "secondary";

interface PipelineActivity {
  id: string;
  stage: BatchStatus;
  kind: ActivityKind;            // primary = advances stage; secondary = helper
  title: string;
  description: string;
  moduleType?: ModuleType;
  advancesTo?: BatchStatus;      // stage after Mark Done
  requiresDriedWeight?: boolean; // prompt for dried_mass_kg before advancing
  showsSummary?: boolean;        // show BatchCompleteSummary after marking done
  buttonLabel?: string;          // override button label
  callsPredict?: boolean;        // call API directly instead of navigating
  callsDistillPredict?: boolean; // call distillation time API directly
  callsQualityPredict?: boolean; // call quality API directly
}

// ─── API → UI mapper ─────────────────────────────────────────────────────────
function mapApiBatch(b: ApiBatch): MaterialBatch {
  return {
    id:                   b.id,
    name:                 b.batch_name ?? `Batch #${b.id}`,
    source:               b.source,
    rawWeightKg:          b.mass_kg,
    driedWeightKg:        b.dried_mass_kg ?? undefined,
    addedDate:            b.created_at.split("T")[0],
    status:               b.process_stage as BatchStatus,
    cinnamonType:         b.cinnamon_type,
    plantPart:            b.plant_part,
    plantAgeYears:        b.plant_age_years,
    harvestSeason:        b.harvest_season,
  };
}

// ─── Stage config ──────────────────────────────────────────────────────────────

const DISTILLATION_STAGE_ICONS: Record<BatchStatus, string> = {
  raw:           "leaf-outline",
  drying:        "weather-sunny",
  distilling:    "flask-outline",
  quality_check: "clipboard-check-outline",
  complete:      "check-circle-outline",
};

function getDistillationStages(t: (k: string) => string) {
  return STATUS_ORDER.map((key) => ({
    key,
    label: t(`oil_yield.home.stages.${key}`),
    icon:  DISTILLATION_STAGE_ICONS[key],
    days:  t(`oil_yield.home.stage_days.${key}`),
  }));
}

const STATUS_ORDER: BatchStatus[] = ["raw", "drying", "distilling", "quality_check", "complete"];

function getStageIndex(status: BatchStatus): number {
  return STATUS_ORDER.indexOf(status);
}

function getStatusLabel(status: BatchStatus, t: (k: string) => string): string {
  return t(`oil_yield.home.stages.${status}`);
}

// ─── Pipeline Activity definitions ───────────────────────────────────────────

function getPipelineActivities(batch: MaterialBatch, t: (k: string) => string): PipelineActivity[] {
  const activities: PipelineActivity[] = [];

  switch (batch.status) {
    // ── Stage 1 & 2: Raw / Drying ─────────────────────────────────────────────
    case "raw":
      activities.push({
        id: `sun-drying-${batch.id}`,
        stage: "raw",
        kind: "primary",
        title: t("oil_yield.home.activities.collect_raw_title"),
        description: t("oil_yield.home.activities.collect_raw_desc"),
        advancesTo: "drying",
      });
      break;

    case "drying":
      activities.push({
        id: `sun-drying-${batch.id}`,
        stage: "drying",
        kind: "primary",
        title: t("oil_yield.home.activities.sun_dry_title"),
        description: t("oil_yield.home.activities.sun_dry_desc"),
        advancesTo: "distilling",
        requiresDriedWeight: true,
      });
      // activities.push({
      //   id: `predict-before-distill-${batch.id}`,
      //   stage: "drying",
      //   kind: "secondary",
      //   title: t("oil_yield.home.activities.predict_before_distill_title"),
      //   description: t("oil_yield.home.activities.predict_before_distill_desc"),
      //   moduleType: "yield-predictor",
      //   buttonLabel: "Predict",
      //   callsPredict: true,
      // });
      break;

    // ── Stage 3: Distilling ───────────────────────────────────────────────────
    case "distilling":
      activities.push({
        id: `distillation-${batch.id}`,
        stage: "distilling",
        kind: "primary",
        title: t("oil_yield.home.activities.distillation_title"),
        description: t("oil_yield.home.activities.distillation_desc"),
        advancesTo: "quality_check",
      });
      activities.push({
        id: `predict-during-distill-${batch.id}`,
        stage: "distilling",
        kind: "secondary",
        title: t("oil_yield.home.activities.predict_during_distill_title"),
        description: t("oil_yield.home.activities.predict_during_distill_desc"),
        moduleType: "distillation",
        buttonLabel: "Predict",
        callsDistillPredict: true,
      });
        activities.push({
          id: `predict-before-distill-${batch.id}`,
          stage: "distilling",
          kind: "secondary",
          title: t("oil_yield.home.activities.predict_before_distill_title"),
          description: t("oil_yield.home.activities.predict_before_distill_desc"),
          moduleType: "yield-predictor",
          buttonLabel: "Predict",
          callsPredict: true,
        });
      
      break;

    // ── Stage 4: Quality Check ────────────────────────────────────────────────
    case "quality_check":
      activities.push({
        id: `quality-check-${batch.id}`,
        stage: "quality_check",
        kind: "primary",
        title: t("oil_yield.home.activities.quality_check_title"),
        description: t("oil_yield.home.activities.quality_check_desc"),
        moduleType: "quality",
        advancesTo: "complete",
        showsSummary: true,
        buttonLabel: "Predict",
        callsQualityPredict: true,
      });
      break;

    // ── Stage 5: Complete ─────────────────────────────────────────────────────
    case "complete":
      activities.push({
        id: `log-yield-${batch.id}`,
        stage: "complete",
        kind: "secondary",
        title: t("oil_yield.home.activities.log_yield_title"),
        description: t("oil_yield.home.activities.log_yield_desc"),
        moduleType: "yield-predictor",
      });
      activities.push({
        id: `market-price-${batch.id}`,
        stage: "complete",
        kind: "secondary",
        title: t("oil_yield.home.activities.market_price_title"),
        description: t("oil_yield.home.activities.market_price_desc"),
        moduleType: "price",
      });
      break;
  }

  return activities;
}

// ─── Colour helpers ────────────────────────────────────────────────────────────

function getModuleColor(m?: ModuleType) {
  switch (m) {
    case "yield-predictor": return "#3B82F6";
    case "distillation":    return "#F59E0B";
    case "quality":         return "#8B5CF6";
    case "price":           return "#10B981";
    default:                return "#6B7280";
  }
}
function getModuleIcon(m?: ModuleType): any {
  switch (m) {
    case "yield-predictor": return "trending-up";
    case "distillation":    return "flask";
    case "quality":         return "clipboard-check-outline" as any;
    case "price":           return "cash";
    default:                return "arrow-forward";
  }
}
function getStatusColor(s: BatchStatus) {
  switch (s) {
    case "raw":           return "#6B7280";
    case "drying":        return "#F59E0B";
    case "distilling":    return "#3B82F6";
    case "quality_check": return "#8B5CF6";
    case "complete":      return "#10B981";
  }
}

// ─── Batch Selector ────────────────────────────────────────────────────────────

function BatchSelector({
  batches,
  selectedId,
  onSelect,
}: {
  batches: MaterialBatch[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.selectorContainer}>
      <Text style={styles.sectionTitle}>{t("oil_yield.home.select_batch")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorScroll}
      >
        {batches.map((batch) => {
          const isSelected  = batch.id === selectedId;
          const statusColor = getStatusColor(batch.status);
          const isPurchased = batch.source === "purchased";
          const hasActiveTasks = batch.status !== "complete";

          return (
            <TouchableOpacity
              key={batch.id}
              style={[styles.selectorCard, isSelected && styles.selectorCardSelected]}
              onPress={() => onSelect(batch.id)}
              activeOpacity={0.8}
            >
              {/* Source badge */}
              <View
                style={[
                  styles.sourceBadge,
                  isPurchased ? styles.sourceBadgePurchased : styles.sourceBadgeOwnFarm,
                ]}
              >
                <Ionicons
                  name={isPurchased ? "cart-outline" : "leaf-outline"}
                  size={10}
                  color={isPurchased ? "#7C3AED" : "#15803D"}
                />
                <Text
                  style={[
                    styles.sourceBadgeText,
                    { color: isPurchased ? "#7C3AED" : "#15803D" },
                  ]}
                >
                  {isPurchased ? t("oil_yield.home.purchased") : t("oil_yield.home.own_farm")}
                </Text>
              </View>

              <View style={styles.selectorIconWrapper}>
                <MaterialCommunityIcons
                  name="flask-outline"
                  size={28}
                  color={isSelected ? "#4CAF50" : "#6B7280"}
                />
                {hasActiveTasks && (
                  <View style={styles.alertBadge}>
                    <MaterialCommunityIcons name="dots-horizontal" size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text
                style={[styles.selectorName, isSelected && styles.selectorNameSelected]}
                numberOfLines={1}
              >
                {batch.name}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
                <Text style={[styles.statusPillText, { color: statusColor }]}>
                  {getStatusLabel(batch.status, t)}
                </Text>
              </View>
              {/* Show dried weight indicator */}
              {batch.status !== "raw" && batch.driedWeightKg && (
                <Text style={styles.selectorWeight}>
                  {batch.driedWeightKg} {t("oil_yield.home.kg_dried")}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Distillation Timeline ─────────────────────────────────────────────────────

// Stages bypassed for purchased batches (raw bark and drying happen externally)
const PURCHASED_BYPASS_STAGES: BatchStatus[] = ["raw", "drying"];

function DistillationTimeline({
  status,
  source,
  viewingStage,
  onStagePress,
}: {
  status: BatchStatus;
  source: BatchSource;
  viewingStage: BatchStatus;
  onStagePress: (stage: BatchStatus) => void;
}) {
  const { t } = useTranslation();
  const currentIndex = getStageIndex(status);
  const isPurchased  = source === "purchased";
  const stages = getDistillationStages(t);

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineHeaderRow}>
        <Text style={styles.timelineTitle}>{t("oil_yield.home.distillation_pipeline")}</Text>
        {isPurchased && (
          <View style={styles.purchasedPipelineBadge}>
            <Ionicons name="cart-outline" size={12} color="#7C3AED" />
            <Text style={styles.purchasedPipelineBadgeText}>{t("oil_yield.home.pre_dried")}</Text>
          </View>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineScroll}
      >
        {stages.map((stage, index) => {
          const isBypassed  = isPurchased && PURCHASED_BYPASS_STAGES.includes(stage.key);
          const isActive    = !isBypassed && index === currentIndex;
          const isPast      = !isBypassed && index < currentIndex;
          const isFuture    = !isBypassed && index > currentIndex;
          const isViewing   = !isBypassed && stage.key === viewingStage;

          return (
            <View key={stage.key} style={styles.timelineStageWrapper}>
              <TouchableOpacity
                onPress={() => { if (!isBypassed) onStagePress(stage.key); }}
                activeOpacity={isBypassed ? 1 : 0.7}
                style={styles.timelineStage}
              >
                <View
                  style={[
                    styles.timelineCircle,
                    isActive   && styles.timelineCircleActive,
                    isPast     && styles.timelineCirclePast,
                    isFuture   && styles.timelineCircleFuture,
                    isBypassed && styles.timelineCircleBypassed,
                    isViewing && !isActive && styles.timelineCircleViewing,
                  ]}
                >
                  {isBypassed ? (
                    <Ionicons name="remove" size={18} color="#D1D5DB" />
                  ) : (
                    <MaterialCommunityIcons
                      name={stage.icon as any}
                      size={20}
                      color={isActive ? "#FFFFFF" : isPast ? "#10B981" : "#9CA3AF"}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.timelineStageName,
                    isActive   && styles.timelineStageNameActive,
                    isBypassed && styles.timelineStageNameBypassed,
                    isViewing && !isActive && styles.timelineStageNameViewing,
                  ]}
                  numberOfLines={2}
                >
                  {stage.label}
                </Text>
                <Text style={[styles.timelineStageDays, isBypassed && { color: "#D1D5DB" }]}>
                  {isBypassed ? t("oil_yield.home.skipped") : stage.days}
                </Text>
              </TouchableOpacity>
              {index < stages.length - 1 && (
                <View
                  style={[
                    styles.timelineLine,
                    isPast     && styles.timelineLinePast,
                    isBypassed && styles.timelineLineBypassed,
                  ]}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Distillation Inline Card (with live timer) ───────────────────────────────

function DistillationInlineCard({
  prediction,
  onNavigate,
}: {
  prediction: DistillationPrediction;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const totalSeconds = Math.round(prediction.predictedTimeHours * 3600);
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (remainingSeconds === 0 && isRunning) setIsRunning(false);
    }
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [isRunning]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = Math.min(((totalSeconds - remainingSeconds) / totalSeconds) * 100, 100);
  const isComplete = remainingSeconds === 0;

  const handleReset = () => {
    setIsRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRemainingSeconds(totalSeconds);
  };

  return (
    <View style={styles.distillInlineCard}>
      {/* Header row */}
      <View style={styles.distillInlineHeader}>
        <View style={[styles.predictionInlineIconCircle, { backgroundColor: "#FEF3C7" }]}>
          <MaterialCommunityIcons name="flask-outline" size={18} color="#F59E0B" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.distillInlineTitle}>{t("oil_yield.home.distill_predicted_time_label")}</Text>
          <Text style={styles.predictionInlineDate}>
            {t("oil_yield.home.predicted_on")}{" "}
            {new Date(prediction.predictedAt).toLocaleDateString(undefined, {
              day: "numeric", month: "short", year: "numeric",
            })}
          </Text>
        </View>
        <View style={styles.distillInlineValueBox}>
          <Text style={styles.distillInlineValue}>{prediction.predictedTimeHours}</Text>
          <Text style={styles.predictionInlineUnit}>hrs</Text>
        </View>
      </View>

      {/* Info chips */}
      <View style={{ flexDirection: "column", gap: 6, marginTop: 8 }}>
        {[
          { label: "Capacity", value: `${prediction.distillationCapacityLiters} L` },
          { label: "Part",     value: prediction.plantPart },
          { label: "Type",     value: prediction.cinnamonType },
        ].map(({ label, value }) => (
          <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.predictionChipLabel}>{label}</Text>
            <Text style={styles.predictionChipValue} numberOfLines={1}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Timer display */}
      <View style={styles.distillTimerBlock}>
        <Text style={[styles.distillTimerDisplay, isComplete && { color: "#10B981" }]}>
          {isComplete ? "✓ " : ""}{formatTime(remainingSeconds)}
        </Text>

        {/* Progress bar */}
        <View style={styles.distillProgressTrack}>
          <View style={[styles.distillProgressFill, { width: `${progress}%` as any }]} />
        </View>

        {/* Controls */}
        <View style={styles.distillTimerControls}>
          <TouchableOpacity
            style={[styles.distillTimerBtn, isComplete && styles.distillTimerBtnDisabled]}
            onPress={() => setIsRunning((r) => !r)}
            disabled={isComplete}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isRunning ? "pause-circle" : "play-circle"}
              size={18}
              color={isComplete ? "#9CA3AF" : "#F59E0B"}
            />
            <Text style={[styles.distillTimerBtnText, isComplete && { color: "#9CA3AF" }]}>
              {isRunning ? t("oil_yield.home.timer_pause") : t("oil_yield.home.timer_start")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.distillTimerResetBtn}
            onPress={handleReset}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={14} color="#6B7280" />
            <Text style={styles.distillTimerResetText}>{t("oil_yield.home.timer_reset")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Re-calculate button */}
      {/* <TouchableOpacity
        style={styles.rePredictButtonAmber}
        onPress={onNavigate}
        activeOpacity={0.85}
      >
        <Ionicons name="calculator-outline" size={14} color="#F59E0B" />
        <Text style={styles.rePredictButtonTextAmber}>{t("oil_yield.home.re_calculate")}</Text>
      </TouchableOpacity> */}
    </View>
  );
}

// ─── Quality Inline Card ──────────────────────────────────────────────────────

function getQualityColor(label: string) {
  if (label === 'Excellent') return '#10B981';
  if (label === 'Good')      return '#3B82F6';
  if (label === 'Fair')      return '#F59E0B';
  return '#EF4444';
}
function getQualityBg(label: string) {
  if (label === 'Excellent') return '#ECFDF5';
  if (label === 'Good')      return '#EFF6FF';
  if (label === 'Fair')      return '#FFFBEB';
  return '#FEF2F2';
}
function getQualityBorder(label: string) {
  if (label === 'Excellent') return '#A7F3D0';
  if (label === 'Good')      return '#BFDBFE';
  if (label === 'Fair')      return '#FDE68A';
  return '#FECACA';
}

function QualityInlineCard({
  prediction,
  onNavigate,
}: {
  prediction: QualityPrediction;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const qColor  = getQualityColor(prediction.label);
  const qBg     = getQualityBg(prediction.label);
  const qBorder = getQualityBorder(prediction.label);

  return (
    <View style={[styles.qualityInlineCard, { backgroundColor: qBg, borderColor: qBorder }]}>
      {/* Header */}
      <View style={styles.qualityInlineHeader}>
        <View style={[styles.predictionInlineIconCircle, { backgroundColor: `${qColor}22` }]}>
          <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={qColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.qualityInlineTitle, { color: qColor }]}>
            {t("oil_yield.home.quality_label")}
          </Text>
          <Text style={styles.predictionInlineDate}>
            {t("oil_yield.home.predicted_on")}{" "}
            {new Date(prediction.predictedAt).toLocaleDateString(undefined, {
              day: "numeric", month: "short", year: "numeric",
            })}
          </Text>
        </View>
        {/* Score circle */}
        <View style={[styles.qualityScoreCircle, { borderColor: qColor }]}>
          <Text style={[styles.qualityScoreValue, { color: qColor }]}>{prediction.score}</Text>
          <Text style={[styles.qualityScoreMax, { color: qColor }]}>/100</Text>
        </View>
      </View>

      {/* Label + price row */}
      <View style={styles.qualityLabelRow}>
        <View style={[styles.qualityLabelBadge, { backgroundColor: `${qColor}22`, borderColor: `${qColor}44` }]}>
          <Text style={[styles.qualityLabelText, { color: qColor }]}>{prediction.label}</Text>
        </View>
        <Text style={styles.qualityPriceText}>{prediction.priceRange}</Text>
      </View>

      {/* Attribute chips */}
      <View style={{ flexDirection: "column", gap: 6, marginTop: 8 }}>
        {[
          { label: "Color",   value: prediction.color },
          { label: "Clarity", value: prediction.clarity },
          { label: "Aroma",   value: prediction.aroma },
        ].map(({ label: chipLabel, value }) => (
          <View key={chipLabel} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.predictionChipLabel}>{chipLabel}</Text>
            <Text style={[styles.predictionChipValue, { color: qColor }]} numberOfLines={1}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Top recommendation */}
      {prediction.recommendations[0] && (
        <View style={[styles.qualityRecRow, { borderLeftColor: qColor }]}>
          <Text style={styles.qualityRecText} numberOfLines={2}>
            {prediction.recommendations[0]}
          </Text>
        </View>
      )}

      {/* Re-assess button */}
      {/* <TouchableOpacity
        style={[styles.rePredictButton, { backgroundColor: `${qColor}18`, borderColor: `${qColor}44` }]}
        onPress={onNavigate}
        activeOpacity={0.85}
      >
        <Ionicons name="refresh" size={14} color={qColor} />
        <Text style={[styles.rePredictButtonText, { color: qColor }]}>
          {t("oil_yield.home.re_assess")}
        </Text>
      </TouchableOpacity> */}
    </View>
  );
}

// ─── Pipeline Activity Card ────────────────────────────────────────────────────

function PipelineActivityCard({
  activity,
  onMarkDone,
  onNavigate,
  onPredict,
  isPredicting,
  onDistillPredict,
  isDistillPredicting,
  onQualityPredict,
  isQualityPredicting,
  stageAdvancing,
  prediction,
  distillationPrediction,
  qualityPrediction,
  isHistorical,
}: {
  activity: PipelineActivity;
  onMarkDone: (a: PipelineActivity) => void;
  onNavigate: (m: ModuleType) => void;
  onPredict?: () => Promise<void>;
  isPredicting?: boolean;
  onDistillPredict?: () => void;
  isDistillPredicting?: boolean;
  onQualityPredict?: () => void;
  isQualityPredicting?: boolean;
  stageAdvancing: boolean;
  prediction?: OilYieldPrediction;
  distillationPrediction?: DistillationPrediction;
  qualityPrediction?: QualityPrediction;
  isHistorical?: boolean;
}) {
  const { t } = useTranslation();
  const moduleColor  = getModuleColor(activity.moduleType);
  const isPrimary    = activity.kind === "primary";
  const canMarkDone  = isPrimary;

  // Show inline prediction results when this is a yield-predictor activity and a prediction exists
  const showInlinePrediction =
    activity.moduleType === "yield-predictor" && !!prediction;

  // Show inline distillation card when this is a distillation activity and a prediction exists
  const showInlineDistillation =
    activity.moduleType === "distillation" && !!distillationPrediction;

  // Show inline quality card when this is a quality activity and a prediction exists
  const showInlineQuality =
    activity.moduleType === "quality" && !!qualityPrediction;

  return (
    <View style={[styles.recCard, !isPrimary && styles.recCardSecondary]}>
      {/* Header */}
      <View style={styles.recHeader}>
        <View style={styles.recTitleRow}>
          <View
            style={[
              styles.activityKindDot,
              { backgroundColor: isPrimary ? "#4CAF50" : moduleColor },
            ]}
          />
          <Text style={styles.recTitle}>{activity.title}</Text>
        </View>
        {/* {isPrimary && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>{t("oil_yield.home.next_step_badge")}</Text>
          </View>
        )} */}
      </View>

      <Text style={styles.recAction}>{activity.description}</Text>

      {/* Inline prediction result OR inline distillation card OR module nav button */}
      {activity.moduleType && (
        showInlinePrediction ? (
          <View style={styles.predictionInlineCard}>
            <View style={styles.predictionInlineHeader}>
              <View style={[styles.predictionInlineIconCircle, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="trending-up" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.predictionInlineTitle}>{t("oil_yield.home.predicted_yield_label")}</Text>
                <Text style={styles.predictionInlineDate}>
                  {t("oil_yield.home.predicted_on")}{" "}
                  {new Date(prediction!.predictedAt).toLocaleDateString(undefined, {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.predictionInlineValueBox}>
                <Text style={styles.predictionInlineValue}>
                  {prediction!.predictedYieldMl.toFixed(1)}
                </Text>
                <Text style={styles.predictionInlineUnit}>mL</Text>
              </View>
            </View>

            {/* Summary chips */}
            <View style={{ flexDirection: "column", gap: 6, marginTop: 8 }}>
              {[
                { label: "Species", value: prediction!.inputSummary.species_variety },
                { label: "Dried",   value: `${prediction!.inputSummary.dried_mass_kg} kg` },
                { label: "Part",    value: prediction!.inputSummary.plant_part },
              ].map(({ label, value }) => (
                <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.predictionChipLabel}>{label}</Text>
                  <Text style={styles.predictionChipValue} numberOfLines={1}>{value}</Text>
                </View>
              ))}
            </View>

            {/* Re-predict button */}
            {/* <TouchableOpacity
              style={styles.rePredictButton}
              onPress={() => onNavigate(activity.moduleType!)}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={14} color="#3B82F6" />
              <Text style={styles.rePredictButtonText}>{t("oil_yield.home.re_predict")}</Text>
            </TouchableOpacity> */}
          </View>
        ) : showInlineDistillation ? (
          <DistillationInlineCard
            prediction={distillationPrediction!}
            onNavigate={() => onNavigate(activity.moduleType!)}
          />
        ) : showInlineQuality ? (
          <QualityInlineCard
            prediction={qualityPrediction!}
            onNavigate={() => onNavigate(activity.moduleType!)}
          />
        ) : (
          <View style={styles.moduleNav}>
            <View style={[styles.moduleTag, { backgroundColor: `${moduleColor}18` }]}>
              <Ionicons name={getModuleIcon(activity.moduleType)} size={13} color={moduleColor} />
              <Text style={[styles.moduleTagText, { color: moduleColor }]}>
                {activity.moduleType.replace("-", " ")}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.goButton, { backgroundColor: moduleColor }]}
              onPress={() => activity.callsDistillPredict ? onDistillPredict?.() : activity.callsQualityPredict ? onQualityPredict?.() : activity.callsPredict ? onPredict?.() : onNavigate(activity.moduleType!)}
              disabled={isPredicting || isDistillPredicting || isQualityPredicting}
              activeOpacity={0.85}
            >
              {(isPredicting && activity.callsPredict) || (isDistillPredicting && activity.callsDistillPredict) || (isQualityPredicting && activity.callsQualityPredict) ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.goButtonText}>{activity.buttonLabel ?? t("oil_yield.home.go_to_module")}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Mark Done footer */}
      {canMarkDone && !isHistorical && (
        <View style={styles.recFooter}>
          <TouchableOpacity
            style={[styles.doneButton, stageAdvancing && styles.doneButtonDisabled]}
            onPress={() => onMarkDone(activity)}
            disabled={stageAdvancing}
            activeOpacity={0.85}
          >
            {stageAdvancing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.doneButtonText}>{t("oil_yield.home.mark_done")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Batch Complete Summary ────────────────────────────────────────────────────

function BatchCompleteSummary({
  batch,
  onNavigate,
}: {
  batch: MaterialBatch;
  onNavigate: (m: ModuleType) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.completeSummaryCard}>
      <View style={styles.completeSummaryHeader}>
        <View style={styles.completeSummaryIconCircle}>
          <Ionicons name="checkmark-circle" size={36} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.completeSummaryTitle}>{t("oil_yield.home.batch_complete_title")}</Text>
          <Text style={styles.completeSummarySubtitle}>{t("oil_yield.home.batch_complete_subtitle")}</Text>
        </View>
      </View>

      {/* Summary Rows */}
      {[
        { label: t("oil_yield.home.batch_name_label"),    value: batch.name },
        { label: t("oil_yield.home.source_label"),        value: batch.source === "own_farm" ? t("oil_yield.home.own_farm") : t("oil_yield.home.purchased") },
        // { label: t("oil_yield.home.raw_weight_label"),    value: `${batch.rawWeightKg} kg` },
        { label: t("oil_yield.home.dried_weight_label"),  value: batch.driedWeightKg ? `${batch.driedWeightKg} kg` : "—" },
        { label: t("oil_yield.home.added_label"),         value: new Date(batch.addedDate).toLocaleDateString() },
      ].map(({ label, value }) => (
        <View key={label} style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>{label}</Text>
          <Text style={styles.summaryRowValue}>{value}</Text>
        </View>
      ))}

      {/* CTA */}
      <TouchableOpacity
        style={styles.marketPriceBtn}
        onPress={() => onNavigate("price")}
        activeOpacity={0.85}
      >
        <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
        <Text style={styles.marketPriceBtnText}>{t("oil_yield.home.check_market_price")}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function OilScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const router = useRouter();

  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [refreshing, setRefreshing]             = useState(false);
  const [batches, setBatches]                   = useState<MaterialBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId]   = useState<number | null>(null);
  const [stageAdvancing, setStageAdvancing]     = useState(false);
  const [showDriedWeightModal, setShowDriedWeightModal] = useState(false);
  const [driedWeightInput, setDriedWeightInput] = useState("");
  const [predictions, setPredictions]           = useState<PredictionsMap>({});
  const [distillationPredictions, setDistillationPredictions] = useState<DistillationPredictionsMap>({});
  const [qualityPredictions, setQualityPredictions]           = useState<QualityPredictionsMap>({});
  const [viewingStage, setViewingStage]                        = useState<BatchStatus | null>(null);
  const [isPredicting, setIsPredicting]                         = useState(false);
  const [showCapacityModal, setShowCapacityModal]               = useState(false);
  const [capacityInput, setCapacityInput]                       = useState("");
  const [isDistillPredicting, setIsDistillPredicting]           = useState(false);
  const [showQualityModal, setShowQualityModal]                 = useState(false);
  const [qualityColor, setQualityColor]                         = useState("");
  const [qualityClarity, setQualityClarity]                     = useState("");
  const [qualityAroma, setQualityAroma]                         = useState("");
  const [isQualityPredicting, setIsQualityPredicting]           = useState(false);

  const fetchBatches = async () => {
    try {
      setError(null);
      const [data, preds, distPreds, qualPreds] = await Promise.all([
        listMaterialBatches(),
        loadPredictions(),
        loadDistillationPredictions(),
        loadQualityPredictions(),
      ]);
      const mapped = data.map(mapApiBatch);
      setBatches(mapped);
      setPredictions(preds);
      setDistillationPredictions(distPreds);
      setQualityPredictions(qualPreds);
      // Auto-select first batch
      if (mapped.length > 0) {
        setSelectedBatchId((prev) => prev ?? mapped[0].id);
      }
    } catch (e: any) {
      setError(e.message ?? t("oil_yield.home.no_batches_desc"));
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => { fetchBatches(); }, []);

  // Reload batches and predictions whenever screen regains focus (e.g. returning from add batch)
  useFocusEffect(
    React.useCallback(() => {
      fetchBatches();
      loadPredictions().then(setPredictions).catch(() => {});
      loadDistillationPredictions().then(setDistillationPredictions).catch(() => {});
      loadQualityPredictions().then(setQualityPredictions).catch(() => {});
    }, [])
  );

  // Reset viewed stage whenever the selected batch changes
  useEffect(() => { setViewingStage(null); }, [selectedBatchId]);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;
  const effectiveStage: BatchStatus = viewingStage ?? selectedBatch?.status ?? "raw";

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBatches();
    setRefreshing(false);
  };

  const handleNavigateToModule = (moduleType: ModuleType) => {
    switch (moduleType) {
      case "yield-predictor": router.push({ pathname: "/oil-yield/predictor-second", params: { batchId: selectedBatchId ?? "" } }); break;
      case "distillation":    router.push("/oil-yield/distillation-process"); break;
      case "quality":         router.push("/oil-yield/quality-guide"); break;
      case "price":           router.push("/oil-yield/price-predictor"); break;
    }
  };

  // ─ Call predict API inline for drying stage ──────────────────────────────────
  const handlePredictBatch = async () => {
    if (!selectedBatch) return;
    const driedMass = selectedBatch.driedWeightKg ?? selectedBatch.rawWeightKg;
    if (!driedMass || driedMass <= 0) {
      Alert.alert(t("oil_yield.home.invalid_weight_title"), t("oil_yield.predictor.alerts.dried_weight_required"));
      return;
    }
    const normalizeSeasonForAPI = (v?: string): string => {
      const s = (v || "").toLowerCase();
      return (s.includes("may") || s.includes("jun") || s.includes("jul") || s.includes("aug"))
        ? "May\u2013August"
        : "October\u2013December/January";
    };
    setIsPredicting(true);
    try {
      const body = {
        dried_mass_kg:     driedMass,
        species_variety:   selectedBatch.cinnamonType ?? "",
        plant_part:        selectedBatch.plantPart ?? "",
        age_years:         selectedBatch.plantAgeYears ?? 0,
        harvesting_season: normalizeSeasonForAPI(selectedBatch.harvestSeason),
      };
      const res = await fetch(`${API_BASE_URL}/oil_yield/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      const yieldMl = parseFloat((data.predicted_yield_liters * 1000).toFixed(2));
      const prediction: OilYieldPrediction = {
        batchId:              selectedBatch.id,
        predictedYieldMl:     yieldMl,
        predictedYieldLiters: data.predicted_yield_liters,
        inputSummary:         data.input_summary,
        recommendation:       data.recommendation ?? { primary: "", tips: [], quality: "" },
        predictedAt:          new Date().toISOString(),
      };
      await savePrediction(prediction);
      setPredictions((prev) => ({ ...prev, [selectedBatch.id]: prediction }));
    } catch (e: any) {
      Alert.alert(t("oil_yield.home.error_title"), e.message ?? t("oil_yield.home.failed_advance"));
    } finally {
      setIsPredicting(false);
    }
  };

  // ─ Distillation time predict inline ─────────────────────────────────────────────
  const handleDistillPredictBatch = () => {
    if (!selectedBatch) return;
    setCapacityInput("");
    setShowCapacityModal(true);
  };

  const commitDistillPredict = async () => {
    if (!selectedBatch) return;
    const capacity = parseFloat(capacityInput);
    if (isNaN(capacity) || capacity <= 0) {
      Alert.alert(t("oil_yield.home.invalid_weight_title"), t("oil_yield.home.invalid_capacity_msg"));
      return;
    }
    setShowCapacityModal(false);
    setCapacityInput("");
    setIsDistillPredicting(true);
    const cinnamonTypeMap: Record<string, string> = { "Sri Gemunu": "Sri Gamunu", "Sri Vijaya": "Sri Wijaya" };
    try {
      const body = {
        plant_part: selectedBatch.plantPart ?? "",
        cinnamon_type: cinnamonTypeMap[selectedBatch.cinnamonType ?? ""] ?? selectedBatch.cinnamonType ?? "",
        distillation_capacity_liters: capacity,
      };
      const res = await fetch(`${API_BASE_URL}/oil_yield/predict_distillation_time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      const roundedTime = parseFloat(data.predicted_time_hours.toFixed(1));
      const prediction: DistillationPrediction = {
        batchId: selectedBatch.id,
        predictedTimeHours: roundedTime,
        distillationCapacityLiters: capacity,
        plantPart: selectedBatch.plantPart ?? "",
        cinnamonType: selectedBatch.cinnamonType ?? "",
        predictedAt: new Date().toISOString(),
      };
      await saveDistillationPrediction(prediction);
      setDistillationPredictions((prev) => ({ ...prev, [selectedBatch.id]: prediction }));
    } catch (e: any) {
      Alert.alert(t("oil_yield.home.error_title"), e.message ?? t("oil_yield.home.failed_advance"));
    } finally {
      setIsDistillPredicting(false);
    }
  };

  // ─ Quality predict inline ────────────────────────────────────────────────────
  const handleQualityPredictBatch = () => {
    if (!selectedBatch) return;
    setQualityColor("");
    setQualityClarity("");
    setQualityAroma("");
    setShowQualityModal(true);
  };

  const commitQualityPredict = async () => {
    if (!selectedBatch) return;
    if (!qualityColor || !qualityClarity || !qualityAroma) {
      Alert.alert(t("oil_yield.home.invalid_weight_title"), t("oil_yield.home.quality_missing_fields"));
      return;
    }
    setShowQualityModal(false);
    setIsQualityPredicting(true);

    const normCinnamonType = (v?: string) => {
      const s = (v || "").trim().toLowerCase();
      if (s.includes("gamunu")) return "Sri Gamunu";
      if (s.includes("wijaya") || s.includes("vijaya")) return "Sri Wijaya";
      return "Sri Gamunu";
    };
    const normPlantPart = (v?: string) => {
      const s = (v || "").trim().toLowerCase();
      if (s.includes("leaf") || s.includes("leave") || s.includes("twig")) return "Leaves & Twigs";
      if (s.includes("feather") || s.includes("chip")) return "Featherings & Chips";
      return "Leaves & Twigs";
    };
    const normHarvestSeason = (v?: string) => {
      const s = (v || "").trim().toLowerCase();
      const allowed = ["january", "april", "july", "october"];
      if (allowed.includes(s)) return s.charAt(0).toUpperCase() + s.slice(1);
      if (s.includes("may") || s.includes("jun") || s.includes("aug")) return "July";
      if (s.includes("oct") || s.includes("nov") || s.includes("dec")) return "October";
      if (s.includes("jan")) return "January";
      return "January";
    };

    try {
      const body = {
        cinnamon_type: normCinnamonType(selectedBatch.cinnamonType),
        plant_part: normPlantPart(selectedBatch.plantPart),
        mass_kg: selectedBatch.driedWeightKg ?? selectedBatch.rawWeightKg,
        plant_age_years: selectedBatch.plantAgeYears ?? 0,
        harvest_season: normHarvestSeason(selectedBatch.harvestSeason),
        color: qualityColor,
        clarity: qualityClarity,
        aroma: qualityAroma,
      };
      const res = await fetch(`${API_BASE_URL}/oil_yield/quality`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      const finalScore = Math.round(data.predicted_quality_score ?? 0);

      let qualityLabel = "";
      let priceRange = "";
      const recs: string[] = [];
      let labAdvice = "";

      if (finalScore >= 85) {
        qualityLabel = "Excellent"; priceRange = "";
        recs.push("Suitable for premium markets and export preparation");
        recs.push("Highly recommended for laboratory certification");
        recs.push("Maintain controlled storage to preserve volatile compounds");
        labAdvice = "Proceed with full laboratory analysis for certification and export.";
      } else if (finalScore >= 70) {
        qualityLabel = "Good"; priceRange = "";
        recs.push("Minor purification may improve market value");
        recs.push("Recommended to refine distillation parameters");
        labAdvice = "Improve quality slightly before investing in laboratory testing.";
      } else if (finalScore >= 50) {
        qualityLabel = "Fair"; priceRange = "";
        recs.push("Filtering or redistillation is advised");
        recs.push("Review raw material handling and drying process");
        labAdvice = "Laboratory testing not cost-effective at this stage.";
      } else {
        qualityLabel = "Poor"; priceRange = "";
        recs.push("Do not proceed with laboratory testing");
        recs.push("Investigate contamination or processing failures");
        labAdvice = "Resolve quality issues before any certification attempts.";
      }

      const prediction: QualityPrediction = {
        batchId: selectedBatch.id,
        score: finalScore,
        label: qualityLabel,
        priceRange,
        recommendations: recs,
        labAdvice,
        color: qualityColor,
        clarity: qualityClarity,
        aroma: qualityAroma,
        cinnamonType: normCinnamonType(selectedBatch.cinnamonType),
        plantPart: normPlantPart(selectedBatch.plantPart),
        predictedAt: new Date().toISOString(),
      };
      await saveQualityPrediction(prediction);
      setQualityPredictions((prev) => ({ ...prev, [selectedBatch.id]: prediction }));
    } catch (e: any) {
      Alert.alert(t("oil_yield.home.error_title"), e.message ?? t("oil_yield.home.failed_advance"));
    } finally {
      setIsQualityPredicting(false);
    }
  };

  // ─ Commit dried weight from modal and advance stage ────────────────────────────
  const commitDriedWeight = async () => {
    if (!selectedBatch) return;
    const kg = parseFloat(driedWeightInput);
    if (isNaN(kg) || kg <= 0) {
      Alert.alert(t("oil_yield.home.invalid_weight_title"), t("oil_yield.home.invalid_weight_msg"));
      return;
    }
    setShowDriedWeightModal(false);
    setDriedWeightInput("");
    setStageAdvancing(true);
    try {
      const updated = await updateMaterialBatch(selectedBatch.id, { dried_mass_kg: kg });
      const mapped  = mapApiBatch(updated);
      setBatches((prev) => prev.map((b) => (b.id === mapped.id ? mapped : b)));
      setViewingStage(null);
    } catch (e: any) {
      Alert.alert(t("oil_yield.home.error_title"), e.message ?? t("oil_yield.home.failed_update_dried"));
    } finally {
      setStageAdvancing(false);
    }
  };

  // ─ Handle Mark Done for any pipeline activity ────────────────────────────────
  const handleMarkActivityDone = async (activity: PipelineActivity) => {
    if (!selectedBatch) return;

    // Drying stage: prompt for dried weight using cross-platform modal
    if (activity.requiresDriedWeight) {
      setDriedWeightInput("");
      setShowDriedWeightModal(true);
      return;
    }

    if (!activity.advancesTo) return;
    setStageAdvancing(true);
    try {
      const updated = await updateMaterialBatch(selectedBatch.id, { process_stage: activity.advancesTo });
      const mapped  = mapApiBatch(updated);
      setBatches((prev) => prev.map((b) => (b.id === mapped.id ? mapped : b)));
      setViewingStage(null);
    } catch (e: any) {
      Alert.alert(t("oil_yield.home.error_title"), e.message ?? t("oil_yield.home.failed_advance"));
    } finally {
      setStageAdvancing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{t("oil_yield.home.loading_batches")}</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>{t("oil_yield.home.title")}</Text>
          </View>
          <Text style={styles.subtitle}>{t("oil_yield.home.subtitle")}</Text>
        </View>

        {/* ── Error Banner ── */}
        {error && (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={fetchBatches}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-offline-outline" size={18} color="#991B1B" />
            <Text style={styles.errorBannerText}>{error}</Text>
            <Text style={styles.errorBannerRetry}>{t("oil_yield.home.retry")}</Text>
          </TouchableOpacity>
        )}

        {/* ── Quick Action CTAs ── */}
        <View style={styles.addBatchRow}>
          {/* Card 1 – Add New Batch */}
          <TouchableOpacity
            style={[styles.addBatchCard, styles.addBatchCardGreen]}
            activeOpacity={0.85}
            onPress={() => router.push("/screens/Oil_yield/AddMaterialBatch")}
          >
            <View style={[styles.addBatchIconSmall, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="add-circle" size={26} color="#16A34A" />
            </View>
            <View style={styles.addBatchLeft}>
              {/* <View style={[styles.startBadge, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                <Ionicons name="flask-outline" size={10} color="#065F46" />
                <Text style={[styles.startBadgeText, { color: "#065F46" }]}>{t("oil_yield.home.add_batch_badge")}</Text>
              </View> */}
              <Text style={styles.addBatchTitle}>{t("oil_yield.home.add_batch_title")}</Text>
              {/* <Text style={styles.addBatchSubtitle}>{t("oil_yield.home.add_batch_subtitle")}</Text> */}
            </View>
          </TouchableOpacity>

          {/* Card 2 – Price Predictor */}
          <TouchableOpacity
            style={[styles.addBatchCard, styles.addBatchCardPurple]}
            activeOpacity={0.85}
            onPress={() => router.push("/oil-yield/price-predictor")}
          >
            <View style={[styles.addBatchIconSmall, { backgroundColor: "#EDE9FE" }]}>
              <Ionicons name="cash" size={26} color="#7C3AED" />
            </View>
            <View style={styles.addBatchLeft}>
              {/* <View style={[styles.startBadge, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }]}>
                <Ionicons name="trending-up" size={10} color="#5B21B6" />
                <Text style={[styles.startBadgeText, { color: "#5B21B6" }]}>{t("oil_yield.home.market_badge")}</Text>
              </View> */}
              <Text style={styles.addBatchTitle}>{t("oil_yield.home.price_predictor_title")}</Text>
              {/* <Text style={styles.addBatchSubtitle}>{t("oil_yield.home.price_predictor_subtitle")}</Text> */}
            </View>
          </TouchableOpacity>
        </View>
        {batches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flask-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>{t("oil_yield.home.no_batches_title")}</Text>
            <Text style={styles.emptyDesc}>{t("oil_yield.home.no_batches_desc")}</Text>
          </View>
        ) : (
          <>
            {/* ── Batch Selector ── */}
            <BatchSelector
              batches={batches}
              selectedId={selectedBatchId}
              onSelect={setSelectedBatchId}
            />

            {/* ── Selected Batch Detail Card ── */}
            {selectedBatch && (
              <View style={styles.detailCard}>

                {/* Batch header info */}
                <View style={styles.detailHeader}>
                  <Text style={styles.detailBatchName}>{selectedBatch.name}</Text>

                  <View style={styles.detailInfoRow}>
                    {/* <View style={styles.weightBox}>
                      <Text style={styles.weightValue}>{selectedBatch.rawWeightKg}</Text>
                      <Text style={styles.weightLabel}>{t("oil_yield.home.kg_unit")}</Text>
                    </View> */}
                    <View style={styles.detailMeta}>
                      {/* <Text style={styles.detailStage}>{getStatusLabel(selectedBatch.status, t)}</Text> */}
                      {selectedBatch.plotName && (
                        <Text style={styles.detailPlot}>📍 {selectedBatch.plotName}</Text>
                      )}
                      <Text style={styles.detailDate}>
                        {t("oil_yield.home.added_prefix")} {new Date(selectedBatch.addedDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {/* Stats row */}
                  {/* <View style={styles.statsRow}> */}
                    {/* <View style={styles.statChip}>
                      <Text style={styles.statLabel}>{t("oil_yield.home.moisture_label")}</Text>
                      <Text style={styles.statValue}>{selectedBatch.moisturePercent ?? "—"}%</Text>
                    </View>
                    <View style={styles.statChip}>
                      <Text style={styles.statLabel}>{t("oil_yield.home.est_yield_label")}</Text>
                      <Text style={styles.statValue}>{selectedBatch.expectedYieldPercent ?? "—"}%</Text>
                    </View> */}
                    {/* <View style={styles.statChip}>
                      <Text style={styles.statLabel}>{t("oil_yield.home.status_label")}</Text>
                      <Text style={[styles.statValue, { color: getStatusColor(selectedBatch.status) }]}>
                        {getStatusLabel(selectedBatch.status, t)}
                      </Text>
                    </View>
                  </View> */}

                  {/* ── Dried Weight Banner ── */}
                  {selectedBatch.source === "own_farm" && !selectedBatch.driedWeightKg ? (
                    <TouchableOpacity
                      style={styles.driedWeightBanner}
                      onPress={() => { setDriedWeightInput(""); setShowDriedWeightModal(true); }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.driedWeightBannerLeft}>
                        <Ionicons name="scale-outline" size={20} color="#92400E" />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.driedWeightBannerTitle}>{t("oil_yield.home.dried_weight_pending")}</Text>
                          <Text style={styles.driedWeightBannerSub}>
                            {t("oil_yield.home.dried_weight_tap")}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.driedWeightBannerBtn}>
                        <Text style={styles.driedWeightBannerBtnText}>{t("oil_yield.home.update")}</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.driedWeightConfirmed}>
                      <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                      <Text style={styles.driedWeightConfirmedText}>
                        Dried weight: <Text style={{ fontWeight: "700" }}>
                          {selectedBatch.driedWeightKg} kg
                        </Text>
                        {selectedBatch.source === "purchased" && (
                          <Text style={styles.driedWeightSourceTag}></Text>
                        )}
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── Distillation Timeline ── */}
                <DistillationTimeline
                  status={selectedBatch.status}
                  source={selectedBatch.source}
                  viewingStage={effectiveStage}
                  onStagePress={setViewingStage}
                />

                {/* ── Pipeline Activities ── */}
                {effectiveStage === "complete" && selectedBatch.status === "complete" ? (
                  <BatchCompleteSummary batch={selectedBatch} onNavigate={handleNavigateToModule} />
                ) : (
                  <>
                    {/* <View style={styles.sectionHeaderWithFilter}>
                      <Text style={styles.sectionSubtitle}>{t("oil_yield.home.pipeline_activities")}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {effectiveStage !== selectedBatch.status && (
                          <TouchableOpacity
                            onPress={() => setViewingStage(null)}
                            activeOpacity={0.8}
                            style={styles.backToCurrentBtn}
                          >
                            <Ionicons name="arrow-back" size={11} color="#6B7280" />
                            <Text style={styles.backToCurrentText}>Current</Text>
                          </TouchableOpacity>
                        )}
                        <View style={[
                          styles.stagePill,
                          effectiveStage !== selectedBatch.status && styles.stagePillViewing,
                        ]}>
                          <Text style={[
                            styles.stagePillText,
                            effectiveStage !== selectedBatch.status && styles.stagePillTextViewing,
                          ]}>
                            {getStatusLabel(effectiveStage, t)}
                          </Text>
                        </View>
                      </View>
                    </View> */}
                    {getPipelineActivities({ ...selectedBatch, status: effectiveStage }, t).map((activity) => (
                      <PipelineActivityCard
                        key={activity.id}
                        activity={activity}
                        onMarkDone={handleMarkActivityDone}
                        onNavigate={handleNavigateToModule}
                        onPredict={activity.callsPredict ? handlePredictBatch : undefined}
                        isPredicting={activity.callsPredict ? isPredicting : undefined}
                        onDistillPredict={activity.callsDistillPredict ? handleDistillPredictBatch : undefined}
                        isDistillPredicting={activity.callsDistillPredict ? isDistillPredicting : undefined}
                        onQualityPredict={activity.callsQualityPredict ? handleQualityPredictBatch : undefined}
                        isQualityPredicting={activity.callsQualityPredict ? isQualityPredicting : undefined}
                        stageAdvancing={stageAdvancing}
                        prediction={
                          activity.moduleType === "yield-predictor"
                            ? predictions[selectedBatch.id]
                            : undefined
                        }
                        distillationPrediction={
                          activity.moduleType === "distillation"
                            ? distillationPredictions[selectedBatch.id]
                            : undefined
                        }
                        qualityPrediction={
                          activity.moduleType === "quality"
                            ? qualityPredictions[selectedBatch.id]
                            : undefined
                        }
                        isHistorical={effectiveStage !== selectedBatch.status}
                      />
                    ))}
                  </>
                )}
              </View>
            )}

          </>
        )}

      {/* ── Modules section ── */}
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{t("oil_yield.home.modules_title")}</Text>
        <View style={styles.toolsCard}>
          {[
            { icon: "flask-outline",           color: "#10B981", bg: "#F0FDF4", label: t("oil_yield.home.modules.yield_predictor_label"),  sub: t("oil_yield.home.modules.yield_predictor_sub"),  route: "/oil-yield/predictor-second"     },
            { icon: "steam",                   color: "#F59E0B", bg: "#FFF7ED", label: t("oil_yield.home.modules.distillation_label"),     sub: t("oil_yield.home.modules.distillation_sub"),    route: "/oil-yield/distillation-process"  },
            { icon: "clipboard-check-outline", color: "#3B82F6", bg: "#EFF6FF", label: t("oil_yield.home.modules.quality_label"),          sub: t("oil_yield.home.modules.quality_sub"),         route: "/oil-yield/quality-guide"         },
            { icon: "chart-line",              color: "#8B5CF6", bg: "#FDF4FF", label: t("oil_yield.home.modules.price_label"),            sub: t("oil_yield.home.modules.price_sub"),           route: "/oil-yield/price-predictor"       },
          ].map((item, index, arr) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.toolRow}
                activeOpacity={0.8}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.toolIcon, { backgroundColor: item.bg }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                </View>
                <View style={styles.toolText}>
                  <Text style={styles.toolLabel}>{item.label}</Text>
                  <Text style={styles.toolSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              {index < arr.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Dried Weight Modal (cross-platform) ── */}
      <Modal
        visible={showDriedWeightModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDriedWeightModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="scale-outline" size={24} color="#4CAF50" />
              <Text style={styles.modalTitle}>{t("oil_yield.home.record_dried_title")}</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {t("oil_yield.home.record_dried_subtitle", { name: selectedBatch?.name ?? "" })}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("oil_yield.home.dried_weight_placeholder")}
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={driedWeightInput}
              onChangeText={setDriedWeightInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowDriedWeightModal(false); setDriedWeightInput(""); }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>{t("oil_yield.home.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, stageAdvancing && styles.doneButtonDisabled]}
                onPress={commitDriedWeight}
                disabled={stageAdvancing}
                activeOpacity={0.85}
              >
                {stageAdvancing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>{t("oil_yield.home.confirm_advance")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Distillation Capacity Modal ── */}
      <Modal
        visible={showCapacityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCapacityModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="flask-outline" size={24} color="#F59E0B" />
              <Text style={styles.modalTitle}>{t("oil_yield.home.distill_capacity_title")}</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {t("oil_yield.home.distill_capacity_subtitle", { name: selectedBatch?.name ?? "" })}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("oil_yield.home.distill_capacity_placeholder")}
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={capacityInput}
              onChangeText={setCapacityInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowCapacityModal(false); setCapacityInput(""); }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>{t("oil_yield.home.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={commitDistillPredict}
                activeOpacity={0.85}
              >
                <Text style={styles.modalConfirmBtnText}>{t("oil_yield.home.predict")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Quality Predict Modal ── */}
      <Modal
        visible={showQualityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalCard, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="#8B5CF6" />
              <Text style={styles.modalTitle}>{t("oil_yield.home.quality_modal_title")}</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {t("oil_yield.home.quality_modal_subtitle", { name: selectedBatch?.name ?? "" })}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {/* Color */}
              <Text style={styles.qualityModalSectionLabel}>{t("oil_yield.quality.color.title")}</Text>
              <View style={styles.qualityModalOptions}>
                {[
                  { value: "pale_yellow", label: t("oil_yield.quality.color.pale_yellow") },
                  { value: "golden",      label: t("oil_yield.quality.color.golden") },
                  { value: "amber",       label: t("oil_yield.quality.color.amber") },
                  { value: "dark",        label: t("oil_yield.quality.color.dark") },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.qualityModalChip, qualityColor === opt.value && styles.qualityModalChipSelected]}
                    onPress={() => setQualityColor(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.qualityModalChipText, qualityColor === opt.value && styles.qualityModalChipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Clarity */}
              <Text style={styles.qualityModalSectionLabel}>{t("oil_yield.quality.clarity.title")}</Text>
              <View style={styles.qualityModalOptions}>
                {[
                  { value: "clear",          label: t("oil_yield.quality.clarity.clear") },
                  { value: "slightly_cloudy", label: t("oil_yield.quality.clarity.slightly_cloudy") },
                  { value: "cloudy",         label: t("oil_yield.quality.clarity.cloudy") },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.qualityModalChip, qualityClarity === opt.value && styles.qualityModalChipSelected]}
                    onPress={() => setQualityClarity(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.qualityModalChipText, qualityClarity === opt.value && styles.qualityModalChipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Aroma */}
              <Text style={styles.qualityModalSectionLabel}>{t("oil_yield.quality.aroma.title")}</Text>
              <View style={styles.qualityModalOptions}>
                {[
                  { value: "mild",     label: t("oil_yield.quality.aroma.mild") },
                  { value: "aromatic", label: t("oil_yield.quality.aroma.aromatic") },
                  { value: "pungent",  label: t("oil_yield.quality.aroma.pungent") },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.qualityModalChip, qualityAroma === opt.value && styles.qualityModalChipSelected]}
                    onPress={() => setQualityAroma(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.qualityModalChipText, qualityAroma === opt.value && styles.qualityModalChipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { marginTop: 12 }]}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowQualityModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>{t("oil_yield.home.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={commitQualityPredict}
                activeOpacity={0.85}
              >
                <Text style={styles.modalConfirmBtnText}>{t("oil_yield.home.predict")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#FAFBFC" },
  scrollView:       { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  loadingText:      { marginTop: 16, fontSize: 16, color: "#6B7280" },

  // Header
  header:     { marginTop: 20, marginBottom: 24 },
  headerTop:  { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backButton: { marginRight: 12, padding: 4 },
  title:      { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle:   { fontSize: 15, color: "#6B7280", lineHeight: 22 },

  // Add Batch CTA
  // Add Batch CTAs
  addBatchRow: {
    flexDirection: "row", gap: 12, marginBottom: 24,
  },
  addBatchCard: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16,
    borderWidth: 1, borderColor: "#F3F4F6", padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6, overflow: "hidden",
  },
  addBatchCardGreen: { borderTopWidth: 3, borderTopColor: "#16A34A" },
  addBatchCardPurple: { borderTopWidth: 3, borderTopColor: "#7C3AED" },
  addBatchIconSmall: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  addBatchInner: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", padding: 20,
    borderLeftWidth: 4, borderLeftColor: "#4CAF50",
  },
  addBatchLeft:        { flex: 1 },
  startBadge:          {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FFFBEB", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: "#FDE68A", marginBottom: 8,
  },
  startBadgeText:      { fontSize: 10, fontWeight: "700", color: "#B45309", letterSpacing: 0.5 },
  addBatchTitle:       { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 4 },
  addBatchSubtitle:    { fontSize: 12, color: "#6B7280", lineHeight: 17 },
  addBatchIconWrapper: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#D1FAE5",
  },

  // Batch Selector
  selectorContainer:    { marginBottom: 20 },
  selectorScroll:       { paddingVertical: 8 },
  selectorCard:         {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14,
    marginRight: 12, width: 130, alignItems: "center",
    borderWidth: 2, borderColor: "#E5E7EB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  selectorCardSelected: { borderColor: "#10B981", backgroundColor: "#F0FDF4" },
  selectorIconWrapper:  { marginBottom: 8, position: "relative" },
  alertBadge:           {
    position: "absolute", top: -4, right: -8,
    backgroundColor: "#EF4444", borderRadius: 10,
    minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  alertBadgeText:       { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  selectorName:         { fontSize: 13, fontWeight: "600", color: "#1F2937", textAlign: "center", marginBottom: 6 },
  selectorNameSelected: { color: "#10B981" },
  statusPill:           { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  statusPillText:       { fontSize: 10, fontWeight: "600" },
  selectorWeight:       { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
  selectorWeightPending: { fontSize: 11, color: "#F59E0B", fontWeight: "600" },

  // Source badges (in BatchSelector)
  sourceBadge:          {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginBottom: 6,
  },
  sourceBadgeOwnFarm:   { backgroundColor: "#F0FDF4" },
  sourceBadgePurchased: { backgroundColor: "#F5F3FF" },
  sourceBadgeText:      { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },

  // Detail card
  detailCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: "#F3F4F6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },
  detailHeader:    { marginBottom: 16 },
  detailBatchName: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 10 },
  detailInfoRow:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  weightBox:       {
    backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, alignItems: "center", marginRight: 14, minWidth: 72,
  },
  weightValue:     { fontSize: 22, fontWeight: "800", color: "#4338CA" },
  weightLabel:     { fontSize: 11, color: "#6366F1", fontWeight: "600", letterSpacing: 0.5 },
  detailMeta:      { flex: 1 },
  detailStage:     { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 2 },
  detailPlot:      { fontSize: 13, color: "#6B7280", marginBottom: 2 },
  detailDate:      { fontSize: 13, color: "#6B7280" },
  statsRow:        { flexDirection: "row", gap: 10 },
  statChip:        {
    flex: 1, backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: "#F3F4F6", alignItems: "center",
  },
  statLabel:       { fontSize: 11, color: "#9CA3AF", fontWeight: "500", marginBottom: 4 },
  statValue:       { fontSize: 14, fontWeight: "700", color: "#111827" },

  // Timeline
  timelineContainer:     {
    backgroundColor: "#F9FAFB", borderRadius: 12, padding: 16,
    marginVertical: 16, borderWidth: 1, borderColor: "#E5E7EB",
  },
  timelineHeaderRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  timelineTitle:         { fontSize: 15, fontWeight: "600", color: "#111827" },
  purchasedPipelineBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F5F3FF", paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: "#DDD6FE",
  },
  purchasedPipelineBadgeText: { fontSize: 11, fontWeight: "600", color: "#7C3AED" },
  timelineScroll:        { paddingBottom: 4 },
  timelineStageWrapper:  { alignItems: "center", flexDirection: "row" },
  timelineStage:         { alignItems: "center", width: 80 },
  timelineCircle:        {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#E5E7EB",
    marginBottom: 8, zIndex: 2,
  },
  timelineCircleActive:  {
    backgroundColor: "#4CAF50", borderColor: "#4CAF50",
    shadowColor: "#4CAF50", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  timelineCirclePast:    { backgroundColor: "#FFFFFF", borderColor: "#10B981" },
  timelineCircleFuture:  { backgroundColor: "#FFFFFF", borderColor: "#D1D5DB" },
  timelineCircleBypassed: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", borderStyle: "dashed" },
  timelineStageName:     { fontSize: 11, color: "#6B7280", textAlign: "center", marginBottom: 4, lineHeight: 15 },
  timelineStageNameActive: { fontWeight: "700", color: "#111827" },
  timelineStageNameBypassed: { color: "#D1D5DB", fontStyle: "italic" },
  timelineStageDays:     { fontSize: 10, color: "#9CA3AF", textAlign: "center" },
  timelineLine:          { width: 24, height: 2, backgroundColor: "#E5E7EB", marginTop: -32, zIndex: 1 },
  timelineLinePast:      { backgroundColor: "#10B981" },
  timelineLineBypassed:  { backgroundColor: "#E5E7EB", opacity: 0.4 },

  // Pipeline Activities
  sectionSubtitle:         { fontSize: 16, fontWeight: "600", color: "#111827" },
  sectionHeaderWithFilter: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 4, marginBottom: 12,
  },
  stagePill: {
    backgroundColor: "#EFF6FF", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  stagePillText: { fontSize: 12, fontWeight: "600", color: "#1D4ED8" },
  recCard:               {
    backgroundColor: "#F9FAFB", borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB",
  },
  recCardSecondary:      {
    backgroundColor: "#FFFFFF", borderStyle: "dashed",
  },
  recHeader:             {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  recTitleRow:           { flexDirection: "row", alignItems: "center", flex: 1 },
  activityKindDot:       { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  recTitle:              { fontSize: 15, fontWeight: "600", color: "#111827", flex: 1 },
  primaryBadge:          {
    backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: "#A7F3D0",
  },
  primaryBadgeText:      { fontSize: 10, fontWeight: "700", color: "#065F46" },
  recAction:             { fontSize: 14, color: "#374151", marginBottom: 12, lineHeight: 20 },
  recMeta:               { marginBottom: 8 },
  recMetaLabel:          { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 2 },
  recMetaText:           { fontSize: 13, color: "#4B5563", lineHeight: 18 },
  moduleNav:             {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB", marginTop: 12,
  },
  moduleTag:             {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  moduleTagText:         { fontSize: 12, fontWeight: "600", marginLeft: 5, textTransform: "capitalize" },
  goButton:              {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  goButtonText:          { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  recFooter:             { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 14 },
  doneButton:            {
    backgroundColor: "#4CAF50", flexDirection: "row",
    alignItems: "center", paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 8, gap: 6,
  },
  doneButtonText:        { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  doneButtonDisabled:    { backgroundColor: "#9CA3AF", opacity: 0.8 },

  // Batch Complete Summary
  completeSummaryCard: {
    backgroundColor: "#F0FDF4", borderRadius: 16, padding: 20,
    marginBottom: 12, borderWidth: 1, borderColor: "#A7F3D0",
  },
  completeSummaryHeader:     { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 14 },
  completeSummaryIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center",
  },
  completeSummaryTitle:    { fontSize: 18, fontWeight: "700", color: "#065F46" },
  completeSummarySubtitle: { fontSize: 13, color: "#059669", marginTop: 2 },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#D1FAE5",
  },
  summaryRowLabel: { fontSize: 13, color: "#065F46", fontWeight: "500" },
  summaryRowValue: { fontSize: 13, color: "#111827", fontWeight: "600" },
  marketPriceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#10B981", borderRadius: 12, paddingVertical: 14,
    marginTop: 18, gap: 8,
    shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  marketPriceBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  // Dried-Weight Modal
  modalOverlay:  {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalCard:     {
    width: "100%", backgroundColor: "#FFFFFF",
    borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
  },
  modalHeader:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  modalTitle:    { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 },
  modalSubtitle: { fontSize: 14, color: "#6B7280", lineHeight: 20, marginBottom: 16 },
  modalInput:    {
    borderWidth: 1.5, borderColor: "#D1D5DB", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, color: "#111827", backgroundColor: "#F9FAFB",
    marginBottom: 20,
  },
  modalActions:     { flexDirection: "row", gap: 12 },
  modalCancelBtn:   {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: "center", backgroundColor: "#F3F4F6",
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  modalCancelBtnText:   { fontSize: 15, fontWeight: "600", color: "#374151" },
  modalConfirmBtn:      {
    flex: 2, paddingVertical: 13, borderRadius: 12,
    alignItems: "center", backgroundColor: "#4CAF50",
    shadowColor: "#4CAF50", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  modalConfirmBtnText:  { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  // Quality modal chips
  qualityModalSectionLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 6 },
  qualityModalOptions:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  qualityModalChip:         {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#D1D5DB", backgroundColor: "#F9FAFB",
  },
  qualityModalChipSelected: { borderColor: "#8B5CF6", backgroundColor: "#F5F3FF" },
  qualityModalChipText:     { fontSize: 13, fontWeight: "500", color: "#6B7280" },
  qualityModalChipTextSelected: { color: "#7C3AED", fontWeight: "700" },

  // Modules
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  toolsCard:    {
    backgroundColor: "#FFFFFF", borderRadius: 16,
    borderWidth: 1, borderColor: "#F3F4F6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
    marginBottom: 20, overflow: "hidden",
  },
  toolRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  toolIcon:   { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  toolText:   { flex: 1 },
  toolLabel:  { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 3 },
  toolSub:    { fontSize: 13, color: "#6B7280" },
  divider:    { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 20 },

  // Empty state
  emptyState: { alignItems: "center", paddingTop: 60, paddingBottom: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: "#111827", marginTop: 16, marginBottom: 8 },
  emptyDesc:  { fontSize: 15, color: "#6B7280", textAlign: "center", paddingHorizontal: 32 },

  // Dried weight banner (own-farm, pending)
  driedWeightBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFFBEB", borderRadius: 10, padding: 12, marginTop: 14,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  driedWeightBannerLeft:  { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 },
  driedWeightBannerTitle: { fontSize: 13, fontWeight: "700", color: "#92400E", marginBottom: 2 },
  driedWeightBannerSub:   { fontSize: 12, color: "#78350F", lineHeight: 16 },
  driedWeightBannerBtn: {
    backgroundColor: "#F59E0B", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  driedWeightBannerBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  // Dried weight confirmed row
  driedWeightConfirmed: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10, marginTop: 14,
    borderWidth: 1, borderColor: "#BBFBB8",
  },
  driedWeightConfirmedText: { fontSize: 13, color: "#166534" },
  driedWeightSourceTag:     { fontSize: 11, color: "#7C3AED", fontStyle: "italic" },

  // Error banner
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: "#FCA5A5",
  },
  errorBannerText:  { flex: 1, fontSize: 13, color: "#991B1B", lineHeight: 18 },
  errorBannerRetry: { fontSize: 13, fontWeight: "700", color: "#DC2626" },

  // Inline prediction result card (inside PipelineActivityCard)
  predictionInlineCard: {
    backgroundColor: "#EFF6FF", borderRadius: 12, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  predictionInlineHeader: {
    flexDirection: "row", alignItems: "center", marginBottom: 10,
  },
  predictionInlineIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  predictionInlineTitle: {
    fontSize: 13, fontWeight: "700", color: "#1E40AF", marginBottom: 2,
  },
  predictionInlineDate: {
    fontSize: 11, color: "#3B82F6",
  },
  predictionInlineValueBox: {
    alignItems: "flex-end",
  },
  predictionInlineValue: {
    fontSize: 22, fontWeight: "800", color: "#1D4ED8",
  },
  predictionInlineUnit: {
    fontSize: 11, color: "#3B82F6", fontWeight: "600",
  },
  predictionChipRow: {
    flexDirection: "row", gap: 8, marginBottom: 10,
  },
  predictionChip: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: "#DBEAFE", alignItems: "center",
  },
  predictionChipLabel: {
    fontSize: 10, color: "#6B7280", fontWeight: "500", marginBottom: 3,
  },
  predictionChipValue: {
    fontSize: 12, color: "#1E40AF", fontWeight: "700", textAlign: "center",
  },
  rePredictButton: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-end",
    backgroundColor: "#DBEAFE", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  rePredictButtonText: {
    fontSize: 12, fontWeight: "700", color: "#3B82F6",
  },

  // ── Distillation inline card ───────────────────────────────────────────────
  distillInlineCard: {
    backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#FDE68A", marginTop: 10,
  },
  distillInlineHeader: {
    flexDirection: "row", alignItems: "center", marginBottom: 10,
  },
  distillInlineTitle: {
    fontSize: 13, fontWeight: "700", color: "#92400E",
  },
  distillInlineValueBox: {
    alignItems: "center",
  },
  distillInlineValue: {
    fontSize: 22, fontWeight: "800", color: "#F59E0B",
  },
  distillTimerBlock: {
    alignItems: "center", marginVertical: 10,
  },
  distillTimerDisplay: {
    fontSize: 32, fontWeight: "800", color: "#374151",
    letterSpacing: 2, fontVariant: ["tabular-nums" as any],
  },
  distillProgressTrack: {
    width: "100%", height: 6, backgroundColor: "#FDE68A",
    borderRadius: 3, marginVertical: 10, overflow: "hidden",
  },
  distillProgressFill: {
    height: 6, backgroundColor: "#F59E0B", borderRadius: 3,
  },
  distillTimerControls: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  distillTimerBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FEF3C7", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: "#FCD34D",
  },
  distillTimerBtnDisabled: {
    backgroundColor: "#F3F4F6", borderColor: "#E5E7EB",
  },
  distillTimerBtnText: {
    fontSize: 13, fontWeight: "700", color: "#F59E0B",
  },
  distillTimerResetBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  distillTimerResetText: {
    fontSize: 12, color: "#6B7280", fontWeight: "600",
  },
  rePredictButtonAmber: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-end",
    backgroundColor: "#FEF3C7", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  rePredictButtonTextAmber: {
    fontSize: 12, fontWeight: "700", color: "#F59E0B",
  },

  // ── Quality inline card ────────────────────────────────────────────────────
  qualityInlineCard: {
    borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 10,
  },
  qualityInlineHeader: {
    flexDirection: "row", alignItems: "center", marginBottom: 10,
  },
  qualityInlineTitle: {
    fontSize: 13, fontWeight: "700",
  },
  qualityScoreCircle: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2.5,
    alignItems: "center", justifyContent: "center",
  },
  qualityScoreValue: {
    fontSize: 18, fontWeight: "800", lineHeight: 20,
  },
  qualityScoreMax: {
    fontSize: 9, fontWeight: "600", lineHeight: 11,
  },
  qualityLabelRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10,
  },
  qualityLabelBadge: {
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
  },
  qualityLabelText: {
    fontSize: 12, fontWeight: "700",
  },
  qualityPriceText: {
    fontSize: 13, fontWeight: "700", color: "#374151",
  },
  qualityRecRow: {
    borderLeftWidth: 3, paddingLeft: 10, marginBottom: 10,
    backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 4, paddingVertical: 6,
  },
  qualityRecText: {
    fontSize: 12, color: "#374151", lineHeight: 17,
  },

  // Viewing-stage indicator on timeline circles
  timelineCircleViewing: {
    borderColor: "#3B82F6",
    borderWidth: 3,
  },
  timelineStageNameViewing: {
    color: "#3B82F6",
    fontWeight: "600" as const,
  },

  // Back-to-current button & viewing pill
  backToCurrentBtn: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 4,
    backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB",
  },
  backToCurrentText: { fontSize: 11, color: "#6B7280", fontWeight: "600" as const },
  stagePillViewing: { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" },
  stagePillTextViewing: { color: "#92400E" },
});
