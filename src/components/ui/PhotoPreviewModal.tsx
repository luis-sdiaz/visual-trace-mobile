import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

type PhotoPreviewModalProps = {
  label: string;
  onClose: () => void;
  onRefresh?: () => Promise<boolean>;
  uri: string | null;
  visible: boolean;
};

type PreviewStatus = "loading" | "available" | "error" | "refreshing";

function PhotoPreviewContent({
  label,
  onClose,
  onRefresh,
  uri,
}: Omit<PhotoPreviewModalProps, "visible">) {
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [refreshRevision, setRefreshRevision] = useState(0);

  async function handleRefresh() {
    if (!onRefresh || status === "refreshing") return;
    setStatus("refreshing");
    try {
      const refreshed = await onRefresh();
      if (!refreshed) {
        setStatus("error");
        return;
      }
      setStatus("loading");
      setRefreshRevision((revision) => revision + 1);
    } catch {
      setStatus("error");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.label}>
          {label}
        </Text>
        <Pressable
          accessibilityLabel="Cerrar vista de fotografía"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>Cerrar</Text>
        </Pressable>
      </View>

      <View style={styles.preview}>
        {uri ? (
          <Image
            accessibilityLabel={`${label} ampliada`}
            key={`${uri}-${refreshRevision}`}
            onError={() => setStatus("error")}
            onLoad={() => setStatus("available")}
            onLoadStart={() => setStatus("loading")}
            resizeMode="contain"
            source={{ uri }}
            style={[styles.image, status === "error" && styles.hiddenImage]}
          />
        ) : null}

        {status !== "available" ? (
          <View style={styles.feedback}>
            {status === "error" ? (
              <>
                <Text style={styles.feedbackTitle}>No pudimos mostrarla</Text>
                <Text style={styles.feedbackDescription}>
                  {onRefresh
                    ? "El acceso privado puede haber caducado."
                    : "La fotografía local ya no está disponible."}
                </Text>
                {onRefresh ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void handleRefresh()}
                    style={styles.refreshButton}
                  >
                    <Text style={styles.refreshText}>Recuperar fotografía</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                <ActivityIndicator color={Colors.surface} />
                <Text style={styles.loadingText}>
                  {status === "refreshing"
                    ? "Recuperando fotografía..."
                    : "Cargando fotografía..."}
                </Text>
              </>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export function PhotoPreviewModal(props: PhotoPreviewModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={props.onClose}
      presentationStyle="fullScreen"
      visible={props.visible}
    >
      {props.visible ? (
        <PhotoPreviewContent
          key={props.uri}
          label={props.label}
          onClose={props.onClose}
          onRefresh={props.onRefresh}
          uri={props.uri}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#101218" },
  header: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
  },
  label: { ...Typography.title, color: Colors.surface },
  closeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  closeText: { ...Typography.label, color: Colors.surface },
  preview: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  hiddenImage: { opacity: 0 },
  feedback: {
    position: "absolute",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  feedbackTitle: {
    ...Typography.title,
    color: Colors.surface,
    textAlign: "center",
  },
  feedbackDescription: {
    ...Typography.body,
    color: Colors.border,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  refreshButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  refreshText: { ...Typography.label, color: Colors.primary },
  loadingText: {
    ...Typography.body,
    color: Colors.surface,
    marginTop: Spacing.md,
  },
});
