import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ScrollView, RefreshControl, Alert, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/navigation/OilYieldNavigator";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listMaterialBatches, updateMaterialBatch,
  type MaterialBatchRead as ApiBatch,
} from "@/services/oilYieldService";
import {
  loadPredictions, savePrediction,
  type OilYieldPrediction, type PredictionsMap,
} from "@/services/oilYieldPredictionStore";
import apiConfig from "@/config/api";

const API_BASE_URL =
  Platform.OS === "web" ? "http://localhost:8000/api/v1" : apiConfig.API_BASE_URL;

type NavigationProp = StackNavigationProp<RootStackParamList>;
type BatchStatus = "raw" | "drying" | "distilling" | "complete";
type BatchSource = "own_farm" | "purchased";

interface MaterialBatch {
  id: number;
  name: string;
  source: BatchSource;
  rawWeightKg: number;
  driedWeightKg?: number;
  addedDate: string;
  status: BatchStatus;
  cinnamonType?: string;
  harvestSeason?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapApiBatch(b: ApiBatch): MaterialBatch {
  return {
    id:            b.id,
    name:          b.batch_name ?? `Batch #${b.id}`,
    source:        b.source,
    rawWeightKg:   b.mass_kg,
    driedWeightKg: b.dried_mass_kg ?? undefined,
    addedDate:     b.created_at.split("T")[0],
    status:        b.process_stage as BatchStatus,
    cinnamonType:  b.cinnamon_type,
    harvestSeason: b.harvest_season,
  };
}

const STATUS_ORDER: BatchStatus[] = ["raw", "drying", "distilling", "complete"];
const STATUS_COLORS: Record<BatchStatus, string> = {
  raw: "#6B7280", drying: "#F59E0B", distilling: "#3B82F6", complete: "#10B981",
};
const STATUS_ICONS: Record<BatchStatus, string> = {
  raw: "leaf-outline", drying: "sunny-outline",
  distilling: "flask-outline", complete: "checkmark-circle-outline",
};

// ─── Batch Chip ───────────────────────────────────────────────────────────────

function BatchChip({
  batch, isSelected, onPress,
}: { batch: MaterialBatch; isSelected: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const color = STATUS_COLORS[batch.status];
  return (
    <TouchableOpacity
      style={[s.chip, { borderLeftColor: color }, isSelected && s.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[s.chipName, isSelected && { color: "#065F46" }]} numberOfLines={1}>
        {batch.name}
      </Text>
      <View style={[s.pill, { backgroundColor: `${color}20` }]}>
        <Text style={[s.pillText, { color }]}>
          {t(`oil_yield.home.stages.${batch.status}`)}
        </Text>
      </View>
      <Text style={s.chipWeight}>
        {batch.driedWeightKg
          ? `${batch.driedWeightKg} ${t("oil_yield.home.kg_dried")}`
          : `${batch.rawWeightKg} kg`}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Stage Timeline ───────────────────────────────────────────────────────────

function StageTimeline({
  batch, viewingStage, onStagePress,
}: {
  batch: MaterialBatch;
  viewingStage: BatchStatus;
  onStagePress: (s: BatchStatus) => void;
}) {
  const { t } = useTranslation();
  const currentIdx = STATUS_ORDER.indexOf(batch.status);
  const isPurchased = batch.source === "purchased";
  const bypassedStages: BatchStatus[] = ["raw", "drying"];

  return (
    <View style={s.timeline}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {STATUS_ORDER.map((stage, i) => {
          const bypassed = isPurchased && bypassedStages.includes(stage);
          const active   = !bypassed && i === currentIdx;
          const past     = !bypassed && i < currentIdx;
          const viewing  = !bypassed && stage === viewingStage;

          return (
            <View key={stage} style={s.stageWrap}>
              <TouchableOpacity
                style={s.stageItem}
                onPress={() => !bypassed && onStagePress(stage)}
                activeOpacity={bypassed ? 1 : 0.7}
              >
                <View style={[
                  s.stageCircle,
                  active && s.stageCircleActive,
                  past && s.stageCirclePast,
                  bypassed && s.stageCircleBypassed,
                  viewing && !active && s.stageCircleViewing,
                ]}>
                  <Ionicons
                    name={STATUS_ICONS[stage] as any}
                    size={18}
                    color={active ? "#fff" : past ? "#10B981" : bypassed ? "#D1D5DB" : "#9CA3AF"}
                  />
                </View>
                <Text style={[
                  s.stageLabel,
                  active && s.stageLabelActive,
                  bypassed && s.stageLabelBypassed,
                  viewing && !active && { color: "#3B82F6", fontWeight: "600" },
                ]}>
                  {bypassed
                    ? t("oil_yield.home.skipped")
                    : t(`oil_yield.home.stages.${stage}`)}
                </Text>
              </TouchableOpacity>
              {i < STATUS_ORDER.length - 1 && (
                <View style={[s.stageLine, past && s.stageLinePast]} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Activity Card ────────────────────────────────────────────────────────────

function ActivityCard({
  title, description, isPrimary, actionLabel, onAction,
  loading, isHistorical, children,
}: {
  title: string;
  description: string;
  isPrimary?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  isHistorical?: boolean;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={[s.card, !isPrimary && s.cardDashed]}>
      <View style={s.cardTitleRow}>
        <View style={[s.dot, { backgroundColor: isPrimary ? "#4CAF50" : "#3B82F6" }]} />
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      <Text style={s.cardDesc}>{description}</Text>
      {children}
      {isPrimary && !isHistorical && actionLabel && (
        <View style={s.cardFooter}>
          <TouchableOpacity
            style={[s.doneBtn, loading && s.doneBtnDisabled]}
            onPress={onAction}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={s.doneBtnText}>{t("oil_yield.home.mark_done")}</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Prediction Inline ────────────────────────────────────────────────────────

function PredictionResult({ prediction }: { prediction: OilYieldPrediction }) {
  const { t } = useTranslation();
  return (
    <View style={s.predCard}>
      <View style={s.predRow}>
        <Ionicons name="trending-up" size={20} color="#3B82F6" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.predLabel}>{t("oil_yield.home.predicted_yield_label")}</Text>
          <Text style={s.predDate}>
            {t("oil_yield.home.predicted_on")}{" "}
            {new Date(prediction.predictedAt).toLocaleDateString(undefined, {
              day: "numeric", month: "short", year: "numeric",
            })}
          </Text>
        </View>
        <Text style={s.predValue}>{prediction.predictedYieldKg.toFixed(1)} kg</Text>
      </View>
      <View style={s.predMeta}>
        <Text style={s.predMetaKey}>Species</Text>
        <Text style={s.predMetaVal}>{prediction.inputSummary.species_variety}</Text>
      </View>
      <View style={s.predMeta}>
        <Text style={s.predMetaKey}>Dried mass</Text>
        <Text style={s.predMetaVal}>{prediction.inputSummary.dried_mass_kg} kg</Text>
      </View>
    </View>
  );
}

// ─── Complete Summary ─────────────────────────────────────────────────────────

function CompleteSummary({
  batch, onPricePress,
}: { batch: MaterialBatch; onPricePress: () => void }) {
  const { t } = useTranslation();
  const rows = [
    { label: t("oil_yield.home.batch_name_label"),   value: batch.name },
    {
      label: t("oil_yield.home.source_label"),
      value: batch.source === "own_farm"
        ? t("oil_yield.home.own_farm")
        : t("oil_yield.home.purchased"),
    },
    {
      label: t("oil_yield.home.dried_weight_label"),
      value: batch.driedWeightKg ? `${batch.driedWeightKg} kg` : "—",
    },
    {
      label: t("oil_yield.home.added_label"),
      value: new Date(batch.addedDate).toLocaleDateString(),
    },
  ];

  return (
    <View style={s.completeCard}>
      <View style={s.completeHeader}>
        <Ionicons name="checkmark-circle" size={32} color="#10B981" />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={s.completeTitle}>{t("oil_yield.home.batch_complete_title")}</Text>
          <Text style={s.completeSub}>{t("oil_yield.home.batch_complete_subtitle")}</Text>
        </View>
      </View>
      {rows.map(({ label, value }) => (
        <View key={label} style={s.summaryRow}>
          <Text style={s.summaryLabel}>{label}</Text>
          <Text style={s.summaryValue}>{value}</Text>
        </View>
      ))}
      <TouchableOpacity style={s.priceBtn} onPress={onPricePress} activeOpacity={0.85}>
        <Ionicons name="cash-outline" size={18} color="#fff" />
        <Text style={s.priceBtnText}>{t("oil_yield.home.check_market_price")}</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OilScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [batches, setBatches]             = useState<MaterialBatch[]>([]);
  const [selectedId, setSelectedId]       = useState<number | null>(null);
  const [advancing, setAdvancing]         = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [driedInput, setDriedInput]       = useState("");
  const [predictions, setPredictions]     = useState<PredictionsMap>({});
  const [viewingStage, setViewingStage]   = useState<BatchStatus | null>(null);
  const [isPredicting, setIsPredicting]   = useState(false);

  const fetchAll = async () => {
    try {
      const data  = await listMaterialBatches();
      const mapped = data.map(mapApiBatch);
      setBatches(mapped);
      if (mapped.length > 0) setSelectedId((prev) => prev ?? mapped[0].id);
      const preds = await loadPredictions().catch(() => ({}));
      setPredictions(preds);
    } catch (e: any) {
      Alert.alert(t("oil_yield.home.error_title"), e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useFocusEffect(useCallback(() => { fetchAll(); }, []));
  useEffect(() => { setViewingStage(null); }, [selectedId]);

  const selected    = batches.find((b) => b.id === selectedId) ?? null;
  const activeStage = viewingStage ?? selected?.status ?? "raw";
  const isHistorical = activeStage !== selected?.status;

  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

  // ─ Predict ─────────────────────────────────────────────────────────────────
  const handlePredict = async () => {
    if (!selected) return;
    const mass = selected.driedWeightKg ?? selected.rawWeightKg;
    if (!mass || mass <= 0) {
      Alert.alert(
        t("oil_yield.home.invalid_weight_title"),
        t("oil_yield.predictor.alerts.dried_weight_required")
      );
      return;
    }
    setIsPredicting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/oil_yield/predict/batch/${selected.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      const prediction: OilYieldPrediction = {
        batchId: selected.id,
        predictedYieldKg: parseFloat(data.predicted_yield_kg.toFixed(2)),
        inputSummary: {
          dried_mass_kg:     data.input_summary?.dried_mass_kg ?? mass,
          species_variety:   data.input_summary?.species_variety ?? (selected.cinnamonType ?? ""),
          age_years:         0,
          harvesting_season: data.input_summary?.harvesting_season ?? (selected.harvestSeason ?? ""),
        },
        recommendation: data.recommendation ?? { primary: "", tips: [], quality: "" },
        predictedAt: new Date().toISOString(),
      };
      await savePrediction(prediction);
      setPredictions((prev) => ({ ...prev, [selected.id]: prediction }));
    } catch (e: any) {
      Alert.alert(t("oil_yield.home.error_title"), e.message);
    } finally {
      setIsPredicting(false);
    }
  };

  // ─ Advance stage ───────────────────────────────────────────────────────────
  const advanceStage = async (nextStage: BatchStatus) => {
    if (!selected) return;
    setAdvancing(true);
    try {
      const updated = await updateMaterialBatch(selected.id, { process_stage: nextStage });
      const mapped  = mapApiBatch(updated);
      setBatches((prev) => prev.map((b) => (b.id === mapped.id ? mapped : b)));
      setViewingStage(null);
    } catch (e: any) {
      Alert.alert(t("oil_yield.home.error_title"), e.message);
    } finally {
      setAdvancing(false);
    }
  };

  // ─ Commit dried weight ──────────────────────────────────────────────────────
  const commitDriedWeight = async () => {
    if (!selected) return;
    const kg = parseFloat(driedInput);
    if (isNaN(kg) || kg <= 0) {
      Alert.alert(t("oil_yield.home.invalid_weight_title"), t("oil_yield.home.invalid_weight_msg"));
      return;
    }
    setShowWeightModal(false);
    setDriedInput("");
    setAdvancing(true);
    try {
      const updated = await updateMaterialBatch(selected.id, { dried_mass_kg: kg });
      const mapped  = mapApiBatch(updated);
      setBatches((prev) => prev.map((b) => (b.id === mapped.id ? mapped : b)));
      setViewingStage(null);
    } catch (e: any) {
      Alert.alert(t("oil_yield.home.error_title"), e.message);
    } finally {
      setAdvancing(false);
    }
  };

  // ─ Render activities by stage ───────────────────────────────────────────────
  const renderActivities = () => {
    if (!selected) return null;
    const pred = predictions[selected.id];

    if (activeStage === "complete" && selected.status === "complete") {
      return (
        <CompleteSummary
          batch={selected}
          onPricePress={() => router.push("/oil-yield/price-predictor")}
        />
      );
    }

    switch (activeStage) {
      case "raw":
        return (
          <ActivityCard
            isPrimary title={t("oil_yield.home.activities.collect_raw_title")}
            description={t("oil_yield.home.activities.collect_raw_desc")}
            actionLabel={t("oil_yield.home.mark_done")}
            onAction={() => advanceStage("drying")}
            loading={advancing} isHistorical={isHistorical}
          />
        );

      case "drying":
        return (
          <ActivityCard
            isPrimary title={t("oil_yield.home.activities.sun_dry_title")}
            description={t("oil_yield.home.activities.sun_dry_desc")}
            actionLabel={t("oil_yield.home.mark_done")}
            onAction={() => { setDriedInput(""); setShowWeightModal(true); }}
            loading={advancing} isHistorical={isHistorical}
          />
        );

      case "distilling":
        return (
          <>
            <ActivityCard
              isPrimary title={t("oil_yield.home.activities.distillation_title")}
              description={t("oil_yield.home.activities.distillation_desc")}
              actionLabel={t("oil_yield.home.mark_done")}
              onAction={() => advanceStage("complete")}
              loading={advancing} isHistorical={isHistorical}
            />
            <ActivityCard
              title={t("oil_yield.home.activities.predict_before_distill_title")}
              description={t("oil_yield.home.activities.predict_before_distill_desc")}
            >
              {pred
                ? <PredictionResult prediction={pred} />
                : (
                  <TouchableOpacity
                    style={[s.goBtn, { backgroundColor: "#3B82F6" }]}
                    onPress={handlePredict}
                    disabled={isPredicting}
                    activeOpacity={0.85}
                  >
                    {isPredicting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <Text style={s.goBtnText}>Predict</Text>
                          <Ionicons name="arrow-forward" size={14} color="#fff" />
                        </>
                    }
                  </TouchableOpacity>
                )}
            </ActivityCard>
          </>
        );

      case "complete":
        return (
          <ActivityCard
            title={t("oil_yield.home.activities.market_price_title")}
            description={t("oil_yield.home.activities.market_price_desc")}
          >
            <TouchableOpacity
              style={[s.goBtn, { backgroundColor: "#10B981" }]}
              onPress={() => router.push("/oil-yield/price-predictor")}
              activeOpacity={0.85}
            >
              <Text style={s.goBtnText}>{t("oil_yield.home.go_to_module")}</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </ActivityCard>
        );
    }
  };

  // ─ Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={s.loadingText}>{t("oil_yield.home.loading_batches")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─ Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{t("oil_yield.home.title")}</Text>
          <Text style={s.subtitle}>{t("oil_yield.home.subtitle")}</Text>
        </View>

        {/* Quick Actions */}
        <View style={s.quickRow}>
          <TouchableOpacity
            style={[s.quickCard, { borderTopColor: "#16A34A" }]}
            onPress={() => router.push("/screens/Oil_yield/AddMaterialBatch")}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={24} color="#16A34A" />
            <Text style={s.quickLabel}>{t("oil_yield.home.add_batch_title")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.quickCard, { borderTopColor: "#7C3AED" }]}
            onPress={() => router.push("/oil-yield/price-predictor")}
            activeOpacity={0.85}
          >
            <Ionicons name="cash" size={24} color="#7C3AED" />
            <Text style={s.quickLabel}>{t("oil_yield.home.price_predictor_title")}</Text>
          </TouchableOpacity>
        </View>

        {batches.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="flask-outline" size={56} color="#9CA3AF" />
            <Text style={s.emptyTitle}>{t("oil_yield.home.no_batches_title")}</Text>
            <Text style={s.emptyDesc}>{t("oil_yield.home.no_batches_desc")}</Text>
          </View>
        ) : (
          <>
            {/* Batch Selector */}
            <Text style={s.sectionTitle}>{t("oil_yield.home.select_batch")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {batches.map((b) => (
                <BatchChip
                  key={b.id} batch={b}
                  isSelected={b.id === selectedId}
                  onPress={() => setSelectedId(b.id)}
                />
              ))}
            </ScrollView>

            {/* Selected Batch */}
            {selected && (
              <View style={s.detailCard}>
                <Text style={s.batchName}>{selected.name}</Text>
                <Text style={s.batchDate}>
                  {t("oil_yield.home.added_prefix")}{" "}
                  {new Date(selected.addedDate).toLocaleDateString()}
                </Text>

                {/* Dried weight banner / confirmed */}
                {selected.source === "own_farm" &&
                !selected.driedWeightKg &&
                selected.status === "drying" ? (
                  <TouchableOpacity
                    style={s.driedBanner}
                    onPress={() => { setDriedInput(""); setShowWeightModal(true); }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="scale-outline" size={18} color="#92400E" />
                    <Text style={s.driedBannerText}>{t("oil_yield.home.dried_weight_pending")}</Text>
                    <Text style={s.driedBannerBtn}>{t("oil_yield.home.update")}</Text>
                  </TouchableOpacity>
                ) : selected.driedWeightKg ? (
                  <View style={s.driedConfirmed}>
                    <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                    <Text style={s.driedConfirmedText}>
                      Dried weight:{" "}
                      <Text style={{ fontWeight: "700" }}>{selected.driedWeightKg} kg</Text>
                    </Text>
                  </View>
                ) : null}

                {/* Timeline */}
                <StageTimeline
                  batch={selected}
                  viewingStage={activeStage}
                  onStagePress={setViewingStage}
                />

                {/* Activities */}
                {renderActivities()}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Dried Weight Modal */}
      <Modal
        visible={showWeightModal} transparent
        animationType="fade"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Ionicons name="scale-outline" size={22} color="#4CAF50" />
              <Text style={s.modalTitle}>{t("oil_yield.home.record_dried_title")}</Text>
            </View>
            <Text style={s.modalSub}>
              {t("oil_yield.home.record_dried_subtitle", { name: selected?.name ?? "" })}
            </Text>
            <TextInput
              style={s.input}
              placeholder={t("oil_yield.home.dried_weight_placeholder")}
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={driedInput}
              onChangeText={setDriedInput}
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowWeightModal(false); setDriedInput(""); }}
                activeOpacity={0.8}
              >
                <Text style={s.cancelBtnText}>{t("oil_yield.home.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, advancing && s.doneBtnDisabled]}
                onPress={commitDriedWeight}
                disabled={advancing}
                activeOpacity={0.85}
              >
                {advancing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.confirmBtnText}>{t("oil_yield.home.confirm_advance")}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#FAFBFC" },
  scroll:      { flex: 1, paddingHorizontal: 20 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 },
  loadingText: { marginTop: 16, fontSize: 16, color: "#6B7280" },

  header:   { marginTop: 20, marginBottom: 20 },
  title:    { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

  quickRow:  { flexDirection: "row", gap: 12, marginBottom: 24 },
  quickCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#F3F4F6",
    borderTopWidth: 3, padding: 14,
    alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  quickLabel: { fontSize: 13, fontWeight: "600", color: "#111827", textAlign: "center" },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 10 },

  chip: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    marginRight: 10, width: 120,
    borderWidth: 1, borderColor: "#E5E7EB", borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  chipSelected: { backgroundColor: "#F0FDF4", borderColor: "#10B981" },
  chipName:     { fontSize: 13, fontWeight: "600", color: "#1F2937", marginBottom: 5 },
  pill:         { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 4 },
  pillText:     { fontSize: 10, fontWeight: "600" },
  chipWeight:   { fontSize: 11, color: "#9CA3AF" },

  detailCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: "#F3F4F6",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 4,
  },
  batchName: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
  batchDate: { fontSize: 13, color: "#6B7280", marginBottom: 8 },

  driedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFFBEB", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: "#FDE68A", marginBottom: 12,
  },
  driedBannerText: { flex: 1, fontSize: 13, color: "#92400E", fontWeight: "600" },
  driedBannerBtn:  { fontSize: 13, fontWeight: "700", color: "#F59E0B" },

  driedConfirmed: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0FDF4", borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: "#BBF7D0", marginBottom: 12,
  },
  driedConfirmedText: { fontSize: 13, color: "#166534" },

  timeline: {
    backgroundColor: "#F9FAFB", borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: "#E5E7EB", marginVertical: 14,
  },
  stageWrap:   { alignItems: "center", flexDirection: "row" },
  stageItem:   { alignItems: "center", width: 76 },
  stageCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#fff", borderWidth: 2, borderColor: "#E5E7EB", marginBottom: 6,
  },
  stageCircleActive:    { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  stageCirclePast:      { borderColor: "#10B981" },
  stageCircleBypassed:  { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" },
  stageCircleViewing:   { borderColor: "#3B82F6", borderWidth: 2.5 },
  stageLabel:           { fontSize: 11, color: "#6B7280", textAlign: "center" },
  stageLabelActive:     { fontWeight: "700", color: "#111827" },
  stageLabelBypassed:   { color: "#D1D5DB", fontStyle: "italic" },
  stageLine:            { width: 20, height: 2, backgroundColor: "#E5E7EB", marginTop: -26 },
  stageLinePast:        { backgroundColor: "#10B981" },

  card: {
    backgroundColor: "#F9FAFB", borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB",
  },
  cardDashed:   { backgroundColor: "#fff", borderStyle: "dashed" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dot:          { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  cardTitle:    { fontSize: 15, fontWeight: "600", color: "#111827", flex: 1 },
  cardDesc:     { fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 10 },
  cardFooter:   { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },

  doneBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#4CAF50", paddingHorizontal: 16,
    paddingVertical: 9, borderRadius: 8, gap: 6,
  },
  doneBtnDisabled: { backgroundColor: "#9CA3AF", opacity: 0.8 },
  doneBtnText:     { color: "#fff", fontSize: 14, fontWeight: "600" },

  goBtn: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, gap: 6, alignSelf: "flex-end", marginTop: 4,
  },
  goBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  predCard: {
    backgroundColor: "#EFF6FF", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#BFDBFE", marginTop: 8,
  },
  predRow:     { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  predLabel:   { fontSize: 13, fontWeight: "700", color: "#1E40AF" },
  predDate:    { fontSize: 11, color: "#3B82F6" },
  predValue:   { fontSize: 20, fontWeight: "800", color: "#1D4ED8" },
  predMeta:    { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  predMetaKey: { fontSize: 11, color: "#6B7280" },
  predMetaVal: { fontSize: 12, color: "#1E40AF", fontWeight: "700" },

  completeCard: {
    backgroundColor: "#F0FDF4", borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: "#A7F3D0", marginBottom: 10,
  },
  completeHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  completeTitle:  { fontSize: 17, fontWeight: "700", color: "#065F46" },
  completeSub:    { fontSize: 13, color: "#059669", marginTop: 2 },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#D1FAE5",
  },
  summaryLabel: { fontSize: 13, color: "#065F46" },
  summaryValue: { fontSize: 13, color: "#111827", fontWeight: "600" },
  priceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#10B981", borderRadius: 10,
    paddingVertical: 13, marginTop: 16, gap: 8,
  },
  priceBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  empty:      { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginTop: 14 },
  emptyDesc:  { fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 6, paddingHorizontal: 30 },

  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalCard: {
    width: "100%", backgroundColor: "#fff", borderRadius: 18, padding: 22,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  modalTitle:  { fontSize: 17, fontWeight: "700", color: "#111827", flex: 1 },
  modalSub:    { fontSize: 14, color: "#6B7280", lineHeight: 20, marginBottom: 14 },
  input: {
    borderWidth: 1.5, borderColor: "#D1D5DB", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 16, color: "#111827", backgroundColor: "#F9FAFB", marginBottom: 18,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    alignItems: "center", backgroundColor: "#F3F4F6",
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  confirmBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    alignItems: "center", backgroundColor: "#4CAF50",
  },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});