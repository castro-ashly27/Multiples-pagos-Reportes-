import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as Sharing from "expo-sharing";

interface PreviewModalProps {
  visible: boolean;
  pdfUri: string | null;
  htmlContent: string | null;
  onClose: () => void;
}

export default function PreviewModal({
  visible,
  pdfUri,
  htmlContent,
  onClose,
}: PreviewModalProps) {
  const handleShare = async () => {
    if (!pdfUri) return;
    try {
      await Sharing.shareAsync(pdfUri, {
        mimeType: "application/pdf",
        dialogTitle: "Imprimir / Guardar Documento",
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      console.error("Error al compartir/imprimir el PDF:", error);
    }
  };

  if (!visible) return null;

  return (
    /* 
      [APILAMIENTO DE MODALES EN ANDROID / SOLUCIÓN DE OVERLAY ABSOLUTO]
      Android no soporta de forma estable múltiples ventanas <Modal> nativas apiladas simultáneamente.
      Para solucionar esto, este componente no usa un <Modal> nativo; en su lugar, se diseña como 
      un contenedor absoluto (position: 'absolute') con zIndex y elevation altos. Se monta como un 
      hijo directo al final de PaymentModal.tsx, superponiéndose perfectamente en toda la pantalla 
      sin bugs visuales ni crashes.
    */
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onClose}>
          <FontAwesome6 name="arrow-left" size={20} color="#333" />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Vista Previa</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.webViewContainer}>
        {htmlContent ? (
          Platform.OS === "web" ? (
            <iframe
              srcDoc={htmlContent}
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          ) : (
            <WebView
              originWhitelist={["*"]}
              source={{ html: htmlContent }}
              style={styles.webView}
              scalesPageToFit={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              allowFileAccess={true}
              allowUniversalAccessFromFileURLs={true}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007bff" />
                  <Text style={styles.loadingText}>Cargando vista previa...</Text>
                </View>
              )}
            />
          )
        ) : (
          <View style={styles.errorContainer}>
            <FontAwesome6
              name="triangle-exclamation"
              size={40}
              color="#dc3545"
            />
            <Text style={styles.errorText}>
              No se pudo cargar el documento
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.printBtn} onPress={handleShare}>
          <FontAwesome6 name="print" size={18} color="#fff" />
          <Text style={styles.btnText}>Imprimir / Guardar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#f1f3f5",
    margin: 10,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dee2e6",
    elevation: 1,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#6c757d",
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#dc3545",
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    gap: 12,
  },
  closeBtn: {
    flex: 1,
    backgroundColor: "#6c757d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
  },
  printBtn: {
    flex: 1.8,
    backgroundColor: "#17a2b8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
