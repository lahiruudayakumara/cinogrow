import React, { useState, useEffect } from "react";
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
import { useRouter } from "expo-router";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/navigation/OilYieldNavigator";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listMaterialBatches,
  updateMaterialBatch,
  type MaterialBatchRead as ApiBatch,
} from "@/services/oilYieldService";

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
}

interface BatchActivity {
  id: number;
  batch_id: number;
  activity_name: string;
  activity_date: string;
  note?: string;
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
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
// Activities remain local until a batch-activity API is added
const SEED_ACTIVITIES: BatchActivity[] = [
  { id: 1, batch_id: -1, activity_name: "Initial moisture recorded",  activity_date: "2025-02-10T09:00:00" },
  { id: 2, batch_id: -1, activity_name: "Bark spread on drying racks", activity_date: "2025-02-11T08:30:00" },
];

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
    // plotName / moisturePercent / expectedYieldPercent not yet in DB
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
    // ── Stage 1: Raw ──────────────────────────────────────────────────────────
    case "raw":
      activities.push({
        id: `collect-raw-${batch.id}`,
        stage: "raw",
        kind: "primary",
        title: "Collect Raw Materials",
        description:
          "Spread fresh cinnamon bark evenly on raised drying racks in a shaded, well-ventilated area. Record the initial weight and avoid direct sunlight to prevent cracking.",
        advancesTo: "drying",
      });
      break;

    // ── Stage 2: Drying ───────────────────────────────────────────────────────
    case "drying":
      activities.push({
        id: `sun-drying-${batch.id}`,
        stage: "drying",
        kind: "primary",
        title: "Sun Dry the Bark",
        description:
          "Turn and rotate bark strips daily. Target moisture \u2264\u202015% before distillation. Once target is reached, record the dried weight to advance to distillation.",
        advancesTo: "distilling",
        requiresDriedWeight: true,
      });
      activities.push({
        id: `predict-before-distill-${batch.id}`,
        stage: "drying",
        kind: "secondary",
        title: "Predict Oil Yield",
        description:
          "Get an early estimate of expected oil output based on bark weight and variety before loading the still.",
        moduleType: "yield-predictor",
      });
      break;

    // ── Stage 3: Distilling ───────────────────────────────────────────────────
    case "distilling":
      activities.push({
        id: `distillation-${batch.id}`,
        stage: "distilling",
        kind: "primary",
        title: "Run Distillation Session",
        description:
          "Load dried bark into the still. Maintain 98\u2013102\u00b0C steam temperature. Log hourly oil collection — stop when rate drops below 2\u202fml/min. Mark done when session is complete.",
        moduleType: "distillation",
        advancesTo: "quality_check",
      });
      activities.push({
        id: `predict-during-distill-${batch.id}`,
        stage: "distilling",
        kind: "secondary",
        title: "Predict Final Oil Yield",
        description:
          "Input current batch weight and distillation hours into the yield predictor for a real-time output estimate.",
        moduleType: "yield-predictor",
      });
      break;

    // ── Stage 4: Quality Check ────────────────────────────────────────────────
    case "quality_check":
      activities.push({
        id: `quality-check-${batch.id}`,
        stage: "quality_check",
        kind: "primary",
        title: "Check Oil Quality Score",
        description:
          "Run the AI quality scorer before sending a sample to a lab. Check refractive index (1.573\u20131.591), colour (pale yellow = Grade A), clarity, and aroma intensity.",
        moduleType: "quality",
        advancesTo: "complete",
        showsSummary: true,
      });
      activities.push({
        id: `price-before-sale-${batch.id}`,
        stage: "quality_check",
        kind: "secondary",
        title: "Check Current Market Price",
        description:
          "Run the price predictor to compare your batch grade against today\u2019s market rates before you sell.",
        moduleType: "price",
      });
      break;

    // ── Stage 5: Complete ─────────────────────────────────────────────────────
    case "complete":
      activities.push({
        id: `log-yield-${batch.id}`,
        stage: "complete",
        kind: "secondary",
        title: "Log Final Yield Data",
        description:"Record final oil volume, yield percentage, and quality grade for historical analysis and batch comparison.",
        moduleType: "yield-predictor",
      });
      activities.push({
        id: `market-price-${batch.id}`,
        stage: "complete",
        kind: "secondary",
        title: "Check Market Price",
        description: "Compare your completed batch grade to live market rates and decide the best time to sell.",
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
              {batch.source === "own_farm" && !batch.driedWeightKg ? (
                <Text style={styles.selectorWeightPending}>⏳ {batch.rawWeightKg} {t("oil_yield.home.kg_raw")}</Text>
              ) : (
                <Text style={styles.selectorWeight}>
                  {batch.driedWeightKg ?? batch.rawWeightKg} {t("oil_yield.home.kg_dried")}
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
}: {
  status: BatchStatus;
  source: BatchSource;
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

          return (
            <View key={stage.key} style={styles.timelineStageWrapper}>
              <View style={styles.timelineStage}>
                <View
                  style={[
                    styles.timelineCircle,
                    isActive   && styles.timelineCircleActive,
                    isPast     && styles.timelineCirclePast,
                    isFuture   && styles.timelineCircleFuture,
                    isBypassed && styles.timelineCircleBypassed,
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
                  ]}
                  numberOfLines={2}
                >
                  {stage.label}
                </Text>
                <Text style={[styles.timelineStageDays, isBypassed && { color: "#D1D5DB" }]}>
                  {isBypassed ? t("oil_yield.home.skipped") : stage.days}
                </Text>
              </View>
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

// ─── Pipeline Activity Card ────────────────────────────────────────────────────

function PipelineActivityCard({
  activity,
  onMarkDone,
  onNavigate,
  stageAdvancing,
}: {
  activity: PipelineActivity;
  onMarkDone: (a: PipelineActivity) => void;
  onNavigate: (m: ModuleType) => void;
  stageAdvancing: boolean;
}) {
  const { t } = useTranslation();
  const moduleColor  = getModuleColor(activity.moduleType);
  const isPrimary    = activity.kind === "primary";
  const canMarkDone  = isPrimary;

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
        {isPrimary && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>{t("oil_yield.home.next_step_badge")}</Text>
          </View>
        )}
      </View>

      <Text style={styles.recAction}>{activity.description}</Text>

      {/* Module nav button */}
      {activity.moduleType && (
        <View style={styles.moduleNav}>
          <View style={[styles.moduleTag, { backgroundColor: `${moduleColor}18` }]}>
            <Ionicons name={getModuleIcon(activity.moduleType)} size={13} color={moduleColor} />
            <Text style={[styles.moduleTagText, { color: moduleColor }]}>
              {activity.moduleType.replace("-", " ")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.goButton, { backgroundColor: moduleColor }]}
            onPress={() => onNavigate(activity.moduleType!)}
            activeOpacity={0.85}
          >
            <Text style={styles.goButtonText}>{t("oil_yield.home.go_to_module")}</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Mark Done footer */}
      {canMarkDone && (
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
        { label: t("oil_yield.home.raw_weight_label"),    value: `${batch.rawWeightKg} kg` },
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

// ─── Recent Activities ─────────────────────────────────────────────────────────

function RecentActivities({
  activities,
  batchId,
}: {
  activities: BatchActivity[];
  batchId: number | null;
}) {
  const { t } = useTranslation();
  const filtered = activities.filter((a) => a.batch_id === batchId);

  return (
    <View style={styles.recentContainer}>
      <Text style={styles.sectionTitle}>{t("oil_yield.home.recent_activities_title")}</Text>
      {filtered.length === 0 ? (
        <View style={styles.noActivitiesCard}>
          <Ionicons name="time-outline" size={32} color="#9CA3AF" />
          <Text style={styles.noActivitiesText}>{t("oil_yield.home.no_activities")}</Text>
        </View>
      ) : (
        filtered.slice(0, 5).map((act, i) => (
          <View key={i} style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.activityName}>{act.activity_name}</Text>
            </View>
            <Text style={styles.activityDate}>
              {new Date(act.activity_date).toLocaleDateString(undefined, {
                day: "numeric", month: "short", year: "numeric",
              })}
            </Text>
          </View>
        ))
      )}
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
  const [activities, setActivities]             = useState<BatchActivity[]>(SEED_ACTIVITIES);
  const [selectedBatchId, setSelectedBatchId]   = useState<number | null>(null);
  const [stageAdvancing, setStageAdvancing]     = useState(false);
  const [showDriedWeightModal, setShowDriedWeightModal] = useState(false);
  const [driedWeightInput, setDriedWeightInput] = useState("");

  const fetchBatches = async () => {
    try {
      setError(null);
      const data = await listMaterialBatches();
      const mapped = data.map(mapApiBatch);
      setBatches(mapped);
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

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBatches();
    setRefreshing(false);
  };

  const handleNavigateToModule = (moduleType: ModuleType) => {
    switch (moduleType) {
      case "yield-predictor": router.push("/oil-yield/predictor-second"); break;
      case "distillation":    router.push("/oil-yield/distillation-process"); break;
      case "quality":         router.push("/oil-yield/quality-guide"); break;
      case "price":           router.push("/oil-yield/price-predictor"); break;
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
      setActivities((prev) => [
        {
          id: Date.now(),
          batch_id: selectedBatch.id,
          activity_name: `${t("oil_yield.home.activities.sun_dry_title")} — ${t("oil_yield.home.dried_weight_prefix")} ${kg}\u202fkg`,
          activity_date: new Date().toISOString(),
        },
        ...prev,
      ]);
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
      setActivities((prev) => [
        {
          id: Date.now(),
          batch_id: selectedBatch.id,
          activity_name: activity.title,
          activity_date: new Date().toISOString(),
        },
        ...prev,
      ]);
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
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
              <View style={[styles.startBadge, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                <Ionicons name="flask-outline" size={10} color="#065F46" />
                <Text style={[styles.startBadgeText, { color: "#065F46" }]}>{t("oil_yield.home.add_batch_badge")}</Text>
              </View>
              <Text style={styles.addBatchTitle}>{t("oil_yield.home.add_batch_title")}</Text>
              <Text style={styles.addBatchSubtitle}>{t("oil_yield.home.add_batch_subtitle")}</Text>
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
              <View style={[styles.startBadge, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }]}>
                <Ionicons name="trending-up" size={10} color="#5B21B6" />
                <Text style={[styles.startBadgeText, { color: "#5B21B6" }]}>{t("oil_yield.home.market_badge")}</Text>
              </View>
              <Text style={styles.addBatchTitle}>{t("oil_yield.home.price_predictor_title")}</Text>
              <Text style={styles.addBatchSubtitle}>{t("oil_yield.home.price_predictor_subtitle")}</Text>
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
                    <View style={styles.weightBox}>
                      <Text style={styles.weightValue}>{selectedBatch.rawWeightKg}</Text>
                      <Text style={styles.weightLabel}>{t("oil_yield.home.kg_unit")}</Text>
                    </View>
                    <View style={styles.detailMeta}>
                      <Text style={styles.detailStage}>{getStatusLabel(selectedBatch.status, t)}</Text>
                      {selectedBatch.plotName && (
                        <Text style={styles.detailPlot}>📍 {selectedBatch.plotName}</Text>
                      )}
                      <Text style={styles.detailDate}>
                        {t("oil_yield.home.added_prefix")} {new Date(selectedBatch.addedDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {/* Stats row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statChip}>
                      <Text style={styles.statLabel}>{t("oil_yield.home.moisture_label")}</Text>
                      <Text style={styles.statValue}>{selectedBatch.moisturePercent ?? "—"}%</Text>
                    </View>
                    <View style={styles.statChip}>
                      <Text style={styles.statLabel}>{t("oil_yield.home.est_yield_label")}</Text>
                      <Text style={styles.statValue}>{selectedBatch.expectedYieldPercent ?? "—"}%</Text>
                    </View>
                    <View style={styles.statChip}>
                      <Text style={styles.statLabel}>{t("oil_yield.home.status_label")}</Text>
                      <Text style={[styles.statValue, { color: getStatusColor(selectedBatch.status) }]}>
                        {getStatusLabel(selectedBatch.status, t)}
                      </Text>
                    </View>
                  </View>

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
                          <Text style={styles.driedWeightSourceTag}>  ’ Purchased, pre-dried</Text>
                        )}
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── Distillation Timeline ── */}
                <DistillationTimeline status={selectedBatch.status} source={selectedBatch.source} />

                {/* ── Pipeline Activities ── */}
                {selectedBatch.status === "complete" ? (
                  <BatchCompleteSummary batch={selectedBatch} onNavigate={handleNavigateToModule} />
                ) : (
                  <>
                    <View style={styles.sectionHeaderWithFilter}>
                      <Text style={styles.sectionSubtitle}>{t("oil_yield.home.pipeline_activities")}</Text>
                      <View style={styles.stagePill}>
                        <Text style={styles.stagePillText}>
                          {getStatusLabel(selectedBatch.status, t)}
                        </Text>
                      </View>
                    </View>
                    {getPipelineActivities(selectedBatch, t).map((activity) => (
                      <PipelineActivityCard
                        key={activity.id}
                        activity={activity}
                        onMarkDone={handleMarkActivityDone}
                        onNavigate={handleNavigateToModule}
                        stageAdvancing={stageAdvancing}
                      />
                    ))}
                  </>
                )}
              </View>
            )}

            {/* ── Recent Activities ── */}
            <RecentActivities activities={activities} batchId={selectedBatchId} />
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
    marginRight: 12, minWidth: 110, alignItems: "center",
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

  // Recent Activities
  recentContainer:   {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  noActivitiesCard:  { alignItems: "center", paddingVertical: 24 },
  noActivitiesText:  { fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center" },
  activityCard:      {
    backgroundColor: "#F9FAFB", borderRadius: 12, padding: 14, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: "#10B981",
  },
  activityHeader:    { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  activityName:      { fontSize: 14, fontWeight: "600", color: "#111827", marginLeft: 8, flex: 1 },
  activityDate:      { fontSize: 12, color: "#6B7280" },

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
});
