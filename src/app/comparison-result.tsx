import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { AiAnalysisLoadingSkeleton } from "@/components/ui/AiAnalysisLoadingSkeleton";
import { AiAnalysisSummaryCard } from "@/components/ui/AiAnalysisSummaryCard";
import { AiOfflineResilienceBanner } from "@/components/ui/AiOfflineResilienceBanner";
import { AiAnalysisErrorFallbackCard } from "@/components/ui/AiAnalysisErrorFallbackCard";
import { AiDifferencesCollapsible } from "@/components/ui/AiDifferencesCollapsible";
import { AiQuotaAlertBanner } from "@/components/ui/AiQuotaAlertBanner";
import { AiQuotaLimitExceededModal } from "@/components/ui/AiQuotaLimitExceededModal";
import { AiReanalyzeConfirmationModal } from "@/components/ui/AiReanalyzeConfirmationModal";
import { AiReportFeedbackCard } from "@/components/ui/AiReportFeedbackCard";
import { ExportReportButton } from "@/components/ui/ExportReportButton";
import { PhotoPreviewModal } from "@/components/ui/PhotoPreviewModal";
import { ReportPreviewModal } from "@/components/ui/ReportPreviewModal";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useComparison } from "@/context/ComparisonContext";
import {
  AnalysisServiceError,
  type AnalysisReportRecord,
} from "@/services/analysisService";
import {
  getAnalysisPresentation,
  isNetworkError,
  performAnalysisAction,
  type AnalysisStatus,
} from "@/services/analysisWorkflow";
import type { ExportReportData } from "@/contracts/reportExport";
import { sharePdfReport } from "@/services/reportExportService";
import { recoverComparison } from "@/services/comparisonRecoveryService";
import {
  MAX_COMPARISON_NAME_LENGTH,
  updateComparisonName,
} from "@/services/comparisonService";
import type { ImageStage } from "@/services/imageStorageService";
import {
  copyReportToClipboard,
  shareReportNative,
} from "@/utils/reportExport";
import { createSingleFlight } from "@/utils/singleFlight";

type PrivateImageStatus = "loading" | "available" | "error" | "retrying";

type PrivateComparisonImageProps = {
  accessibilityLabel: string;
  uri: string;
  onRetry: () => Promise<boolean>;
  onOpen: () => void;
};

function PrivateComparisonImage({
  accessibilityLabel,
  uri,
  onRetry,
  onOpen,
}: PrivateComparisonImageProps) {
  const [status, setStatus] = useState<PrivateImageStatus>("loading");

  async function handleRetry() {
    if (status === "retrying") {
      return;
    }

    setStatus("retrying");

    const refreshed = await onRetry();

    if (!refreshed) {
      setStatus("error");
    }
  }

  const isAvailable = status === "available";

  return (
    <View style={styles.imageFrame}>
      <Pressable
        accessibilityLabel={`Ampliar ${accessibilityLabel.toLowerCase()}`}
        accessibilityRole="button"
        disabled={!isAvailable}
        onPress={onOpen}
        style={styles.image}
      >
        <Image
          accessibilityLabel={accessibilityLabel}
          onError={() => setStatus("error")}
          onLoad={() => setStatus("available")}
          onLoadStart={() => setStatus("loading")}
          source={{ uri }}
          style={[styles.image, !isAvailable && styles.hiddenImage]}
        />
      </Pressable>

      {!isAvailable ? (
        <View style={styles.imageFeedback}>
          {status === "error" ? (
            <>
              <Text style={styles.imageErrorTitle}>No pudimos cargarla</Text>
              <Text style={styles.imageErrorDescription}>
                El acceso privado puede haber caducado.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleRetry()}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>
                {status === "retrying"
                  ? "Recuperando fotografía..."
                  : "Cargando fotografía..."}
              </Text>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function ComparisonResultScreen() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { user } = useAuth();
  const {
    comparisonId,
    name,
    initialImageUri,
    initialImagePath,
    finalImageUri,
    finalImagePath,
    restoreComparison,
    setName,
  } = useComparison();
  const userId = user?.id;
  const refreshSequenceRef = useRef(0);
  const [refreshSingleFlight] = useState(() => createSingleFlight<boolean>());
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("loading_report");
  const isAnalyzing = analysisStatus === "analyzing";
  const [showReanalyzeModal, setShowReanalyzeModal] = useState(false);
  const [showQuotaExceededModal, setShowQuotaExceededModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleBack = useCallback(() => {
    if (showPreviewModal) {
      setShowPreviewModal(false);
      return true;
    }
    if (showQuotaExceededModal) {
      setShowQuotaExceededModal(false);
      return true;
    }
    if (showReanalyzeModal) {
      setShowReanalyzeModal(false);
      return true;
    }
    if (isAnalyzing) {
      return true;
    }
    if (
      source === "history" ||
      (Array.isArray(source) && source[0] === "history")
    ) {
      router.dismissTo("/home");
    } else {
      router.back();
    }
    return true;
  }, [isAnalyzing, showPreviewModal, showQuotaExceededModal, showReanalyzeModal, source]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [handleBack]),
  );
  const [analysisReport, setAnalysisReport] = useState<AnalysisReportRecord | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisQuotaScope, setAnalysisQuotaScope] = useState<string | undefined>(undefined);
  const [copiedReport, setCopiedReport] = useState(false);
  const [isSharingReport, setIsSharingReport] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewStage, setPreviewStage] = useState<ImageStage | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const analysisSequenceRef = useRef(0);
  const analysisMountedRef = useRef(true);
  const analysisInFlightRef = useRef<string | null>(null);
  const renamingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const restoreComparisonRef = useRef(restoreComparison);
  const analysisContext = `${comparisonId ?? ""}\u0000${initialImagePath ?? ""}\u0000${finalImagePath ?? ""}`;

  useEffect(() => {
    analysisMountedRef.current = true;
    return () => {
      analysisMountedRef.current = false;
      analysisSequenceRef.current += 1;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    restoreComparisonRef.current = restoreComparison;
  }, [restoreComparison]);

  const refreshPrivateImages = useCallback((): Promise<boolean> => {
    if (!comparisonId || !userId) {
      return Promise.resolve(false);
    }

    return refreshSingleFlight.run(async () => {
      const refreshSequence = ++refreshSequenceRef.current;
      const requestComparisonId = comparisonId;
      const requestUserId = userId;

      try {
        const recovery = await recoverComparison(requestComparisonId);

        if (
          refreshSequence !== refreshSequenceRef.current ||
          requestComparisonId !== comparisonId ||
          requestUserId !== userId ||
          !isFocusedRef.current
        ) {
          return false;
        }

        restoreComparisonRef.current({
          comparisonId: recovery.comparison.id,
          name: recovery.comparison.name,
          initialImageUri: recovery.initialImageUri,
          initialImagePath: recovery.comparison.initial_image_path,
          initialImageIsDirty: false,
          finalImageUri: recovery.finalImageUri,
          finalImagePath: recovery.comparison.final_image_path,
          finalImageIsDirty: false,
          initialImageIsTransient: recovery.initialImageUri !== null,
          finalImageIsTransient: recovery.finalImageUri !== null,
        });

        return true;
      } catch (error) {
        console.error("Failed to refresh private comparison images:", error);
        return false;
      }
    });
  }, [comparisonId, refreshSingleFlight, userId]);

  useEffect(() => {
    refreshSequenceRef.current += 1;
    refreshSingleFlight.clear();
  }, [comparisonId, refreshSingleFlight, userId]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      void refreshPrivateImages();

      return () => {
        isFocusedRef.current = false;
        refreshSequenceRef.current += 1;
        refreshSingleFlight.clear();
      };
    }, [refreshPrivateImages, refreshSingleFlight]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isFocusedRef.current) {
        void refreshPrivateImages();
      }
    });

    return () => subscription.remove();
  }, [refreshPrivateImages]);

  const loadReport = useCallback(async () => {
    const operationKey = `report\u0000${analysisContext}`;
    if (analysisInFlightRef.current === operationKey) return;
    analysisInFlightRef.current = operationKey;
    const sequence = ++analysisSequenceRef.current;
    await Promise.resolve();
    if (
      !analysisMountedRef.current ||
      sequence !== analysisSequenceRef.current
    ) {
      if (analysisInFlightRef.current === operationKey) {
        analysisInFlightRef.current = null;
      }
      return;
    }
    setAnalysisReport(null);
    setAnalysisMessage("");
    setAnalysisQuotaScope(undefined);

    if (!comparisonId || !initialImagePath || !finalImagePath) {
      setAnalysisStatus("ready");
      analysisInFlightRef.current = null;
      return;
    }

    setAnalysisStatus("loading_report");
    try {
      const report = await performAnalysisAction("retry_report", {
        comparisonId,
        initialImagePath,
        finalImagePath,
      });
      if (
        !analysisMountedRef.current ||
        sequence !== analysisSequenceRef.current
      ) return;
      setAnalysisReport(report);
      setAnalysisStatus(report ? "available" : "ready");
    } catch (error) {
      if (
        !analysisMountedRef.current ||
        sequence !== analysisSequenceRef.current
      ) return;
      const unavailable =
        error instanceof AnalysisServiceError && error.code === "reports_unavailable";
      setAnalysisStatus(unavailable ? "reports_unavailable" : "report_error");
      setAnalysisMessage(
        unavailable
          ? "El análisis con IA todavía no está disponible. Tus fotografías están guardadas y podrás analizarlas cuando el servicio esté habilitado."
          : "No pudimos consultar el informe guardado. Tus fotografías siguen disponibles.",
      );
    } finally {
      if (analysisInFlightRef.current === operationKey) {
        analysisInFlightRef.current = null;
      }
    }
  }, [analysisContext, comparisonId, finalImagePath, initialImagePath]);

  useEffect(() => {
    void Promise.resolve().then(loadReport);
    return () => {
      analysisSequenceRef.current += 1;
    };
  }, [loadReport]);

  const handleCopyReport = useCallback(async () => {
    if (!analysisReport) return;
    const copied = await copyReportToClipboard(analysisReport.result, {
      comparisonName: nameDraft || name,
    });
    if (copied && analysisMountedRef.current) {
      setCopiedReport(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        if (analysisMountedRef.current) {
          setCopiedReport(false);
        }
      }, 2500);
    }
  }, [analysisReport, name, nameDraft]);

  const handleOpenExportPreview = useCallback(() => {
    if (!analysisReport) return;
    setShowPreviewModal(true);
  }, [analysisReport]);

  const handleSharePdf = useCallback(async () => {
    if (!analysisReport || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const exportData: ExportReportData = {
        report: analysisReport.result,
        metadata: {
          comparisonId,
          comparisonName: nameDraft || name,
          createdAt: analysisReport.created_at,
        },
        images: {
          initialImageUri,
          finalImageUri,
        },
      };
      const result = await sharePdfReport(exportData, {
        filename: nameDraft || name || "VisualTrace-Reporte",
      });
      if (result.success && !result.cancelled && analysisMountedRef.current) {
        setShowPreviewModal(false);
      }
    } finally {
      if (analysisMountedRef.current) {
        setIsExportingPdf(false);
      }
    }
  }, [analysisReport, comparisonId, finalImageUri, initialImageUri, isExportingPdf, name, nameDraft]);

  const handleShareReport = useCallback(async () => {
    if (!analysisReport || isSharingReport) return;
    setIsSharingReport(true);
    try {
      await shareReportNative(analysisReport.result, {
        comparisonName: nameDraft || name,
      });
    } finally {
      if (analysisMountedRef.current) {
        setIsSharingReport(false);
      }
    }
  }, [analysisReport, isSharingReport, name, nameDraft]);

  function handleRequestReanalysis() {
    setShowReanalyzeModal(true);
  }

  function handleCancelReanalysis() {
    setShowReanalyzeModal(false);
  }

  function handleConfirmReanalysis() {
    setShowReanalyzeModal(false);
    void executeAnalysisRequest();
  }

  async function executeAnalysisRequest() {
    if (!comparisonId || !initialImagePath || !finalImagePath) return;

    const operationKey = `analysis\u0000${analysisContext}`;
    if (analysisInFlightRef.current === operationKey) return;
    analysisInFlightRef.current = operationKey;
    const sequence = ++analysisSequenceRef.current;
    setAnalysisStatus("analyzing");
    setAnalysisMessage("");
    setAnalysisQuotaScope(undefined);
    try {
      const report = await performAnalysisAction("analyze", {
        comparisonId,
        initialImagePath,
        finalImagePath,
      });
      if (
        !analysisMountedRef.current ||
        sequence !== analysisSequenceRef.current
      ) return;
      setAnalysisReport(report);
      setAnalysisStatus("available");
    } catch (error) {
      if (
        !analysisMountedRef.current ||
        sequence !== analysisSequenceRef.current
      ) return;
      const isOffline = isNetworkError(error);
      const isQuota =
        !isOffline &&
        error instanceof AnalysisServiceError &&
        error.code === "usage_limit_reached";
      const scope = error instanceof AnalysisServiceError ? error.scope : undefined;

      if (isOffline) {
        setAnalysisStatus("network_offline");
        setAnalysisQuotaScope(undefined);
        setAnalysisMessage(
          "Sin conexión a internet. Comprueba tu conectividad y vuelve a intentar.",
        );
      } else if (isQuota) {
        setAnalysisStatus("limited");
        setAnalysisQuotaScope(scope);
        setAnalysisMessage("");
        setShowQuotaExceededModal(true);
      } else {
        setAnalysisStatus("analysis_error");
        setAnalysisQuotaScope(undefined);
        setAnalysisMessage(
          error instanceof Error
            ? error.message
            : "No fue posible completar el análisis.",
        );
      }
    } finally {
      if (analysisInFlightRef.current === operationKey) {
        analysisInFlightRef.current = null;
      }
    }
  }

  async function handleAnalysisAction() {
    const action = getAnalysisPresentation(
      analysisStatus,
      Boolean(comparisonId && initialImagePath && finalImagePath),
    ).action;
    if (!action) return;
    if (action === "retry_report") {
      await loadReport();
      return;
    }
    await executeAnalysisRequest();
  }

  function beginRenaming() {
    setNameDraft(name);
    setRenameError(null);
    setIsEditingName(true);
  }

  async function handleRename() {
    const normalizedName = nameDraft.trim();
    if (
      !comparisonId ||
      !normalizedName ||
      normalizedName.length > MAX_COMPARISON_NAME_LENGTH ||
      renamingRef.current
    ) return;

    if (normalizedName === name.trim()) {
      setIsEditingName(false);
      return;
    }

    renamingRef.current = true;
    setIsRenaming(true);
    setRenameError(null);
    try {
      await updateComparisonName(comparisonId, normalizedName);
      setName(normalizedName);
      setIsEditingName(false);
    } catch {
      setRenameError("No pudimos cambiar el nombre. Inténtalo nuevamente.");
    } finally {
      renamingRef.current = false;
      setIsRenaming(false);
    }
  }

  const hasComparisonData =
    name.trim().length > 0 && initialImageUri && finalImageUri;
  const analysisPresentation = getAnalysisPresentation(
    analysisStatus,
    Boolean(comparisonId && initialImagePath && finalImagePath),
  );

  if (!hasComparisonData) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerLeft: () => (
              <Pressable
                accessibilityLabel="Volver"
                accessibilityRole="button"
                onPress={handleBack}
                style={styles.backButton}
              >
                <Text style={styles.backIcon}>←</Text>
                <Text style={styles.backText}>Volver</Text>
              </Pressable>
            ),
          }}
        />
        <View style={styles.missingContent}>
          <View style={styles.missingIcon}>
            <Text style={styles.missingIconText}>!</Text>
          </View>

          <Text style={styles.missingTitle}>Comparación incompleta</Text>

          <Text style={styles.missingDescription}>
            Necesitas completar el nombre, el estado inicial y el estado final
            antes de visualizar la comparación.
          </Text>

          <Button
            label="Volver al inicio"
            onPress={() => router.replace("/home")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Volver"
              accessibilityRole="button"
              disabled={isAnalyzing}
              onPress={handleBack}
              style={[styles.backButton, isAnalyzing && styles.disabledButton]}
            >
              <Text style={styles.backIcon}>←</Text>
              <Text style={styles.backText}>Volver</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          disabled={isAnalyzing}
          onPress={handleBack}
          style={[styles.backButton, isAnalyzing && styles.disabledButton]}
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>COMPARACIÓN</Text>

          {isEditingName ? (
            <View style={styles.renameCard}>
              <TextInput
                accessibilityLabel="Nuevo nombre de la comparación"
                autoCapitalize="sentences"
                autoCorrect
                editable={!isRenaming}
                maxLength={MAX_COMPARISON_NAME_LENGTH}
                onChangeText={(value) => {
                  setNameDraft(value);
                  setRenameError(null);
                }}
                returnKeyType="done"
                style={styles.renameInput}
                value={nameDraft}
              />
              {renameError ? (
                <Text style={styles.renameError}>{renameError}</Text>
              ) : null}
              <View style={styles.renameActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isRenaming}
                  onPress={() => {
                    setIsEditingName(false);
                    setRenameError(null);
                  }}
                  style={styles.renameCancel}
                >
                  <Text style={styles.renameCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!nameDraft.trim() || isRenaming}
                  onPress={() => void handleRename()}
                  style={styles.renameSave}
                >
                  <Text style={styles.renameSaveText}>
                    {isRenaming ? "Guardando..." : "Guardar nombre"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.titleRow}>
              <Text style={[styles.title, styles.titleInRow]}>{name}</Text>
              <Pressable
                accessibilityLabel="Editar nombre de la comparación"
                accessibilityRole="button"
                disabled={isAnalyzing}
                onPress={beginRenaming}
                style={[styles.editNameButton, isAnalyzing && styles.disabledButton]}
              >
                <Text style={styles.editNameText}>Editar</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.description}>
            Revisa ambas fotografías antes de iniciar el análisis visual.
          </Text>
        </View>

        <View style={styles.comparisonSection}>
          <View style={styles.imageCard}>
            <View style={styles.imageHeader}>
              <View style={styles.initialBadge}>
                <Text style={styles.initialBadgeText}>Inicial</Text>
              </View>

              <Text style={styles.imageLabel}>Antes</Text>
            </View>

            <PrivateComparisonImage
              accessibilityLabel="Fotografía del estado inicial"
              key={initialImageUri}
              onRetry={refreshPrivateImages}
              onOpen={() => setPreviewStage("initial")}
              uri={initialImageUri}
            />
          </View>

          <View style={styles.connector}>
            <View style={styles.connectorLine} />
            <View style={styles.connectorIcon}>
              <Text style={styles.connectorIconText}>↓</Text>
            </View>
            <View style={styles.connectorLine} />
          </View>

          <View style={styles.imageCard}>
            <View style={styles.imageHeader}>
              <View style={styles.finalBadge}>
                <Text style={styles.finalBadgeText}>Final</Text>
              </View>

              <Text style={styles.imageLabel}>Después</Text>
            </View>

            <PrivateComparisonImage
              accessibilityLabel="Fotografía del estado final"
              key={finalImageUri}
              onRetry={refreshPrivateImages}
              onOpen={() => setPreviewStage("final")}
              uri={finalImageUri}
            />
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Text style={styles.statusIconText}>✓</Text>
          </View>

          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>
              {analysisPresentation.statusTitle}
            </Text>

            <Text style={styles.statusDescription}>
              {analysisPresentation.statusDescription}
            </Text>
          </View>
        </View>

        {analysisStatus === "loading_report" ? (
          <View style={styles.analysisLoading}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Buscando informe guardado...</Text>
          </View>
        ) : null}

        {analysisReport ? (
          <View style={styles.reportCard}>
            <View style={styles.reportHeaderRow}>
              <Text style={styles.reportEyebrow}>RESUMEN DE IA</Text>
              <View style={styles.reportHeaderActions}>
                <Pressable
                  accessibilityHint="Copia el resumen, diferencias y observaciones al portapapeles"
                  accessibilityLabel="Copiar informe"
                  accessibilityRole="button"
                  onPress={() => void handleCopyReport()}
                  style={[
                    styles.copyReportButton,
                    copiedReport && styles.copyReportButtonActive,
                  ]}
                  testID="copy-report-button"
                >
                  <Text
                    style={[
                      styles.copyReportButtonText,
                      copiedReport && styles.copyReportButtonTextActive,
                    ]}
                  >
                    {copiedReport ? "✓ Copiado" : "📋 Copiar informe"}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityHint="Comparte el informe completo de IA con otras aplicaciones"
                  accessibilityLabel="Compartir informe"
                  accessibilityRole="button"
                  disabled={isSharingReport}
                  onPress={() => void handleShareReport()}
                  style={[
                    styles.shareReportButton,
                    isSharingReport && styles.disabledButton,
                  ]}
                  testID="share-report-button"
                >
                  <Text style={styles.shareReportButtonText}>
                    ↗ Compartir
                  </Text>
                </Pressable>
                <ExportReportButton
                  disabled={isExportingPdf}
                  isLoading={isExportingPdf}
                  onPress={handleOpenExportPreview}
                  testID="export-pdf-report-button"
                />
              </View>
            </View>

            {copiedReport ? (
              <View
                accessibilityLiveRegion="polite"
                style={styles.copiedFeedbackBadge}
                testID="copied-feedback-badge"
              >
                <Text style={styles.copiedFeedbackIcon}>✓</Text>
                <Text style={styles.copiedFeedbackText}>
                  ¡Copiado al portapapeles!
                </Text>
              </View>
            ) : null}

            <AiAnalysisSummaryCard report={analysisReport} />
            <Text style={styles.reportSummary}>{analysisReport.result.summary}</Text>

            {/* Sección: Diferencias detectadas con tarjetas desplegables por categoría */}
            <AiDifferencesCollapsible
              differences={analysisReport.result.differences}
            />

            {analysisReport.result.observations.length > 0 ? (
              <>
                <Text style={styles.reportSectionTitle}>Observaciones</Text>
                {analysisReport.result.observations.map((item, index) => (
                  <Text key={`observation-${index}`} style={styles.reportBullet}>• {item}</Text>
                ))}
              </>
            ) : null}

            {analysisReport.result.uncertainties.length > 0 ? (
              <>
                <Text style={styles.reportSectionTitle}>Limitaciones</Text>
                {analysisReport.result.uncertainties.map((item, index) => (
                  <Text key={`uncertainty-${index}`} style={styles.reportBullet}>• {item}</Text>
                ))}
              </>
            ) : null}

            <View style={styles.reviewNotice}>
              <Text style={styles.reviewNoticeText}>
                Este informe es una ayuda automática. Verifica los hallazgos mediante revisión humana.
              </Text>
            </View>

            <AiReportFeedbackCard comparisonId={comparisonId ?? undefined} />
          </View>
        ) : null}

        {analysisStatus === "limited" ? (
          <AiQuotaAlertBanner
            onRetry={() => void executeAnalysisRequest()}
            scope={analysisQuotaScope}
          />
        ) : analysisStatus === "network_offline" ? (
          <AiOfflineResilienceBanner
            onRetry={() => void executeAnalysisRequest()}
          />
        ) : analysisStatus === "analysis_error" || analysisStatus === "report_error" || analysisMessage ? (
          <AiAnalysisErrorFallbackCard
            errorMessage={analysisMessage}
            onRetry={() => void executeAnalysisRequest()}
          />
        ) : null}

        <View style={styles.footer}>
          {analysisPresentation.action && analysisPresentation.actionLabel ? (
            <Button
              disabled={isAnalyzing || analysisStatus === "loading_report"}
              label={analysisPresentation.actionLabel}
              onPress={() => void handleAnalysisAction()}
            />
          ) : analysisReport ? (
            <Pressable
              accessibilityHint="Abre el diálogo de advertencia para volver a evaluar la comparación con IA"
              accessibilityLabel="Re-analizar comparación"
              accessibilityRole="button"
              disabled={isAnalyzing}
              onPress={handleRequestReanalysis}
              style={[
                styles.reanalyzeButton,
                isAnalyzing && styles.disabledButton,
              ]}
              testID="reanalyze-button"
            >
              <Text style={styles.reanalyzeButtonText}>
                🔄 Re-analizar comparación
              </Text>
            </Pressable>
          ) : null}

          <Text style={styles.disclaimer}>
            VisualTrace identificará posibles diferencias visibles. La revisión
            final siempre corresponde al usuario.
          </Text>
        </View>
      </ScrollView>
            <Modal
        accessibilityLabel="Análisis de IA en curso"
        accessibilityViewIsModal
        animationType="fade"
        onRequestClose={() => {
          // Bloqueo intencional: se evita cerrar el modal mientras la solicitud está en vuelo
        }}
        statusBarTranslucent
        testID="ai-analysis-modal"
        transparent
        visible={isAnalyzing}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AiAnalysisLoadingSkeleton />
          </View>
        </View>
      </Modal>

      <PhotoPreviewModal
        label={previewStage === "final" ? "Estado final" : "Estado inicial"}
        onClose={() => setPreviewStage(null)}
        onRefresh={refreshPrivateImages}
        uri={previewStage === "final" ? finalImageUri : initialImageUri}
        visible={previewStage !== null}
      />

      <AiReanalyzeConfirmationModal
        onCancel={handleCancelReanalysis}
        onConfirm={handleConfirmReanalysis}
        visible={showReanalyzeModal}
      />

      <AiQuotaLimitExceededModal
        onClose={() => setShowQuotaExceededModal(false)}
        onViewHistory={() => {
          setShowQuotaExceededModal(false);
          router.replace("/home");
        }}
        scope={analysisQuotaScope}
        visible={showQuotaExceededModal}
      />
      <ReportPreviewModal
        isGenerating={isExportingPdf}
        onClose={() => setShowPreviewModal(false)}
        onSharePdf={() => void handleSharePdf()}
        reportData={
          analysisReport
            ? {
                report: analysisReport.result,
                metadata: {
                  comparisonId,
                  comparisonName: nameDraft || name,
                  createdAt: analysisReport.created_at,
                },
                images: {
                  initialImageUri,
                  finalImageUri,
                },
              }
            : null
        }
        visible={showPreviewModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: Spacing.xl,
  },
  disabledButton: {
    opacity: 0.5,
  },

  backIcon: {
    color: Colors.textPrimary,
    fontSize: 22,
    marginRight: Spacing.sm,
  },

  backText: {
    ...Typography.label,
    color: Colors.textPrimary,
  },

  header: {
    marginBottom: Spacing.xl,
  },

  eyebrow: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },

  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },

  titleInRow: {
    flex: 1,
    marginBottom: 0,
  },

  editNameButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    marginLeft: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
  },

  editNameText: {
    ...Typography.label,
    color: Colors.primary,
  },

  renameCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },

  renameInput: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.md,
  },

  renameError: {
    ...Typography.body,
    color: Colors.danger,
    marginTop: Spacing.sm,
  },

  renameActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: Spacing.md,
  },

  renameCancel: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
  },

  renameCancelText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },

  renameSave: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },

  renameSaveText: {
    ...Typography.label,
    color: Colors.textInverse,
  },

  description: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  comparisonSection: {
    marginBottom: Spacing.xl,
  },

  imageCard: {
    overflow: "hidden",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },

  imageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },

  initialBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
  },

  initialBadgeText: {
    ...Typography.label,
    color: Colors.primary,
  },

  finalBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.full,
  },

  finalBadgeText: {
    ...Typography.label,
    color: Colors.success,
  },

  imageLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  imageFrame: {
    width: "100%",
    aspectRatio: 4 / 3,
  },

  hiddenImage: {
    opacity: 0,
  },

  imageFeedback: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surfaceSecondary,
  },

  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },

  imageErrorTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    textAlign: "center",
  },

  imageErrorDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.xs,
  },

  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
  },

  retryButtonText: {
    ...Typography.label,
    color: Colors.primary,
  },

  connector: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },

  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },

  connectorIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
  },

  connectorIconText: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: "700",
  },

  statusCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
  },

  statusIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    marginRight: Spacing.md,
  },

  statusIconText: {
    color: Colors.success,
    fontSize: 18,
    fontWeight: "700",
  },

  statusTextContainer: {
    flex: 1,
  },

  statusTitle: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },

  statusDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  footer: {
    marginTop: Spacing.sm,
  },

  analysisLoading: {
    alignItems: "center",
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  reportCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: Radius.xl,
  },

  reportHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    flexWrap: "wrap",
  },

  reportHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },

  copyReportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },

  copyReportButtonActive: {
    backgroundColor: Colors.successSoft,
    borderColor: Colors.success,
  },

  copyReportButtonText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.primary,
  },

  copyReportButtonTextActive: {
    color: Colors.successDark,
    fontWeight: "700",
  },

  shareReportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },

  shareReportButtonText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textPrimary,
  },

  copiedFeedbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.successSoft,
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },

  copiedFeedbackIcon: {
    color: Colors.successDark,
    fontSize: 14,
    fontWeight: "700",
  },

  copiedFeedbackText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.successDark,
    fontWeight: "600",
  },

  reportEyebrow: {
    ...Typography.label,
    color: Colors.primary,
  },

  reportSummary: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
  },

  reportSectionTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },

  reportItem: {
    padding: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceBlue,
    borderRadius: Radius.lg,
  },

  reportItemLabel: {
    ...Typography.label,
    color: Colors.primaryDark,
    marginBottom: Spacing.xs,
  },

  reportItemText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },

  reportEmpty: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  reportBullet: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },

  reviewNotice: {
    padding: Spacing.md,
    marginTop: Spacing.xl,
    backgroundColor: Colors.warningSoft,
    borderRadius: Radius.lg,
  },

  reviewNoticeText: {
    ...Typography.label,
    color: Colors.warning,
  },


  reanalyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },

  reanalyzeButtonText: {
    ...Typography.button,
    color: Colors.primary,
    fontSize: 15,
  },

  disclaimer: {
    ...Typography.label,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.md,
  },

  missingContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },

  missingIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: Colors.warningSoft,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
  },

  missingIconText: {
    color: Colors.warning,
    fontSize: 24,
    fontWeight: "700",
  },

  missingTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  missingDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },

  modalContent: {
    width: "100%",
    maxWidth: 480,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },

});