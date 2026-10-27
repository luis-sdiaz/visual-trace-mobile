import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import type { ExportReportData } from "@/contracts/reportExport";
import { calculateVisualSeverity } from "./AiAnalysisSummaryCard";
import { formatReportDate } from "@/utils/reportExportTemplate";

export type ReportPreviewModalProps = {
  visible: boolean;
  reportData: ExportReportData | null;
  onClose: () => void;
  onSharePdf: () => void;
  isGenerating?: boolean;
};

export function ReportPreviewModal({
  visible,
  reportData,
  onClose,
  onSharePdf,
  isGenerating = false,
}: ReportPreviewModalProps) {
  if (!reportData) {
    return null;
  }

  const { report, metadata, images } = reportData;
  const severity = calculateVisualSeverity(report.differences, report.hasVisibleChanges);
  const title = metadata?.comparisonName?.trim() || "Informe Comparativo";
  const dateFormatted = formatReportDate(metadata?.createdAt);

  return (
    <Modal
      accessibilityLabel="Vista previa de exportación de informe"
      accessibilityViewIsModal
      animationType="fade"
      onRequestClose={isGenerating ? undefined : onClose}
      statusBarTranslucent
      testID="report-preview-modal"
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent} testID="report-preview-modal-content">
          {/* Cabecera */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerBadge}>PDF</Text>
              <Text numberOfLines={1} style={styles.headerTitle}>
                Vista previa del informe
              </Text>
            </View>
            <Pressable
              accessibilityHint="Cierra la ventana de vista previa"
              accessibilityLabel="Cerrar vista previa"
              accessibilityRole="button"
              disabled={isGenerating}
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
              testID="preview-close-button"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Tarjeta de Metadatos y Severidad */}
            <View style={styles.metaCard}>
              <View style={styles.metaTop}>
                <Text numberOfLines={2} style={styles.comparisonTitle}>
                  {title}
                </Text>
                <View
                  style={[
                    styles.severityBadge,
                    {
                      backgroundColor: severity.backgroundColor,
                      borderColor: severity.borderColor,
                    },
                  ]}
                  testID="preview-severity-badge"
                >
                  <Text
                    style={[styles.severityBadgeText, { color: severity.color }]}
                  >
                    {severity.badgeText}
                  </Text>
                </View>
              </View>
              <Text style={styles.metaDate}>{dateFormatted}</Text>
            </View>

            {/* Miniaturas de Fotografías */}
            {(images?.initialImageUri ||
              images?.initialImageBase64 ||
              images?.finalImageUri ||
              images?.finalImageBase64) ? (
              <View style={styles.imagesContainer} testID="preview-images-container">
                <View style={styles.imageBox}>
                  <Text style={styles.imageTag}>Estado Inicial</Text>
                  {images.initialImageUri || images.initialImageBase64 ? (
                    <Image
                      accessibilityLabel="Miniatura estado inicial"
                      resizeMode="cover"
                      source={{
                        uri: images.initialImageBase64 || images.initialImageUri || "",
                      }}
                      style={styles.thumbnail}
                    />
                  ) : (
                    <View style={styles.emptyThumb}>
                      <Text style={styles.emptyThumbText}>Sin imagen</Text>
                    </View>
                  )}
                </View>

                <View style={styles.imageBox}>
                  <Text style={styles.imageTag}>Estado Final</Text>
                  {images.finalImageUri || images.finalImageBase64 ? (
                    <Image
                      accessibilityLabel="Miniatura estado final"
                      resizeMode="cover"
                      source={{
                        uri: images.finalImageBase64 || images.finalImageUri || "",
                      }}
                      style={styles.thumbnail}
                    />
                  ) : (
                    <View style={styles.emptyThumb}>
                      <Text style={styles.emptyThumbText}>Sin imagen</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            {/* Resumen Ejecutivo */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>📌 Resumen Ejecutivo</Text>
              <Text style={styles.summaryText}>{report.summary}</Text>
            </View>

            {/* Hallazgos */}
            <View style={styles.findingsCard}>
              <Text style={styles.findingsTitle}>
                🔍 {report.differences.length}{" "}
                {report.differences.length === 1
                  ? "hallazgo identificado"
                  : "hallazgos identificados"}
              </Text>
              <Text style={styles.findingsNotice}>
                El documento incluirá el desglose detallado con observaciones y
                advertencias de IA.
              </Text>
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.footer}>
            <Pressable
              accessibilityHint="Cancela y cierra el diálogo"
              accessibilityLabel="Cancelar"
              accessibilityRole="button"
              disabled={isGenerating}
              onPress={onClose}
              style={[styles.actionButton, styles.cancelButton]}
              testID="preview-cancel-button"
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              accessibilityHint="Exporta y comparte el informe completo en PDF"
              accessibilityLabel="Compartir PDF"
              accessibilityRole="button"
              disabled={isGenerating}
              onPress={onSharePdf}
              style={[
                styles.actionButton,
                styles.confirmButton,
                isGenerating && styles.disabledButton,
              ]}
              testID="preview-share-pdf-button"
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator
                    color={Colors.white}
                    size="small"
                    style={{ marginRight: Spacing.xs }}
                  />
                  <Text style={styles.confirmButtonText}>Generando...</Text>
                </>
              ) : (
                <Text style={styles.confirmButtonText}>↗ Compartir PDF</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    width: "100%",
    maxWidth: 460,
    maxHeight: "85%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  headerBadge: {
    backgroundColor: Colors.primary,
    color: Colors.white,
    fontWeight: "800",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  headerTitle: {
    ...Typography.title,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  scrollBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  metaCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  metaTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  comparisonTitle: {
    ...Typography.title,
    fontSize: 15,
    flex: 1,
    color: Colors.textPrimary,
  },
  severityBadge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaDate: {
    ...Typography.label,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  imagesContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  imageBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    overflow: "hidden",
    backgroundColor: Colors.backgroundStrong,
  },
  imageTag: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  thumbnail: {
    width: "100%",
    height: 90,
  },
  emptyThumb: {
    width: "100%",
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyThumbText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  summaryCard: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  summaryTitle: {
    ...Typography.label,
    fontSize: 13,
    color: Colors.primaryDark,
    marginBottom: Spacing.xs,
  },
  summaryText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  findingsCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  findingsTitle: {
    ...Typography.label,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  findingsNotice: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  cancelButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  cancelButtonText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    ...Typography.label,
    color: Colors.white,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

