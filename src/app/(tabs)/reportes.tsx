import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { PrintService } from "../../services/printService";
import { SaleRepository } from "../../database/repositories/saleRepository";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function Reportes() {
  const [rango, setRango] = useState<"hoy" | "semana" | "mes" | "custom">(
    "hoy"
  );
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState<"desde" | "hasta" | null>(null);

  const [resumen, setResumen] = useState<any>(null);
  const [ventas, setVentas] = useState<any[]>([]);

  // Función para formatear fecha a YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentPicker = showPicker;
    setShowPicker(null);
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate);
      if (currentPicker === "desde") setDesde(formattedDate);
      else if (currentPicker === "hasta") setHasta(formattedDate);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (rango === "custom") {
        if (desde && hasta) cargarReporte(desde, hasta);
      } else {
        handleRangoChange(rango);
      }
    }, [rango, desde, hasta])
  );

  const handleRangoChange = (nuevoRango: string) => {
    const hoy = new Date();
    let d = "";
    let h = formatDate(hoy);

    if (nuevoRango === "hoy") {
      d = formatDate(hoy);
    } else if (nuevoRango === "semana") {
      const semanaAtras = new Date();
      semanaAtras.setDate(hoy.getDate() - 7);
      d = formatDate(semanaAtras);
    } else if (nuevoRango === "mes") {
      const mesAtras = new Date();
      mesAtras.setMonth(hoy.getMonth() - 1);
      d = formatDate(mesAtras);
    }

    if (nuevoRango !== "custom") {
      setDesde(d);
      setHasta(h);
      cargarReporte(d, h);
    }
  };

  const cargarReporte = async (d: string, h: string) => {
    if (!d || !h) return;
    setLoading(true);
    try {
      const dataVentas = await SaleRepository.getByDateRange(d, h);
      const dataResumen = await SaleRepository.getReportSummary(d, h);

      setVentas(dataVentas);
      setResumen(dataResumen);
    } catch (error) {
      console.error("Error al cargar reporte", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsultarCustom = () => {
    cargarReporte(desde, hasta);
  };

  const handleExportarPDF = async () => {
    if (!resumen || ventas.length === 0) {
      Alert.alert("Sin datos", "No hay datos para exportar en este período.");
      return;
    }

    try {
      await PrintService.printSalesReport(ventas, resumen, { desde, hasta });
    } catch (error) {
      Alert.alert("Error", "No se pudo exportar el PDF.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reportes de Ventas</Text>
        <TouchableOpacity style={styles.pdfButton} onPress={handleExportarPDF}>
          <FontAwesome6 name="file-pdf" size={16} color="white" />
          <Text style={styles.pdfButtonText}>Exportar PDF</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.rangoButtons}>
          <TouchableOpacity
            style={[styles.rangoBtn, rango === "hoy" && styles.rangoBtnActive]}
            onPress={() => setRango("hoy")}
          >
            <Text
              style={[
                styles.rangoText,
                rango === "hoy" && styles.rangoTextActive,
              ]}
            >
              Hoy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rangoBtn,
              rango === "semana" && styles.rangoBtnActive,
            ]}
            onPress={() => setRango("semana")}
          >
            <Text
              style={[
                styles.rangoText,
                rango === "semana" && styles.rangoTextActive,
              ]}
            >
              7 Días
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rangoBtn, rango === "mes" && styles.rangoBtnActive]}
            onPress={() => setRango("mes")}
          >
            <Text
              style={[
                styles.rangoText,
                rango === "mes" && styles.rangoTextActive,
              ]}
            >
              Mes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rangoBtn,
              rango === "custom" && styles.rangoBtnActive,
            ]}
            onPress={() => setRango("custom")}
          >
            <Text
              style={[
                styles.rangoText,
                rango === "custom" && styles.rangoTextActive,
              ]}
            >
              Fechas
            </Text>
          </TouchableOpacity>
        </View>

        {rango === "custom" && (
          <View style={styles.customDateContainer}>
            <View style={styles.dateInputWrapper}>
              <Text style={styles.dateLabel}>Desde</Text>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => setShowPicker("desde")}
              >
                <Text>{desde || "Seleccionar..."}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateInputWrapper}>
              <Text style={styles.dateLabel}>Hasta</Text>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => setShowPicker("hasta")}
              >
                <Text>{hasta || "Seleccionar..."}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.consultarBtn}
              onPress={handleConsultarCustom}
            >
              <FontAwesome6 name="magnifying-glass" size={16} color="white" />
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0ab546"
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView style={styles.content}>
          {resumen && (
            <>
              <View style={styles.summaryCardsRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.cardLabel}>Ingresos Totales</Text>
                  <Text style={[styles.cardValue, { color: "#0ab546" }]}>
                    C${resumen.stats.totalMonto?.toFixed(2) || "0.00"}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.cardLabel}>Anuladas</Text>
                  <Text style={[styles.cardValue, { color: "#dc3545" }]}>
                    {resumen.stats.anuladas || 0}
                  </Text>
                </View>
              </View>

              <View style={styles.methodBreakdown}>
                <Text style={styles.sectionTitle}>Ingresos por Método</Text>
                {Object.keys(resumen.methodTotals).length > 0 ? (
                  Object.entries(resumen.methodTotals).map(
                    ([metodo, total]: any) => (
                      <View key={metodo} style={styles.methodRow}>
                        <Text style={styles.methodName}>
                          {metodo.toUpperCase()}
                        </Text>
                        <Text style={styles.methodAmount}>
                          C${total.toFixed(2)}
                        </Text>
                      </View>
                    )
                  )
                ) : (
                  <Text style={styles.noDataText}>
                    No hay ingresos registrados.
                  </Text>
                )}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                Ventas del Período ({resumen.stats.totalVentas || 0})
              </Text>
              {ventas.length === 0 ? (
                <Text style={styles.noDataText}>
                  No se encontraron ventas en este rango.
                </Text>
              ) : (
                ventas.map((v, index) => (
                  <View
                    key={index}
                    style={[
                      styles.ventaItem,
                      v.estado === "anulado" && { opacity: 0.5 },
                    ]}
                  >
                    <View>
                      <Text style={styles.ventaId}>Venta #{v.id}</Text>
                      <Text style={styles.ventaDate}>{v.fecha}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[
                          styles.ventaTotal,
                          v.estado === "anulado" && {
                            textDecorationLine: "line-through",
                          },
                        ]}
                      >
                        C${v.total?.toFixed(2)}
                      </Text>
                      <Text
                        style={[
                          styles.ventaStatus,
                          v.estado === "anulado"
                            ? { color: "red" }
                            : { color: "green" },
                        ]}
                      >
                        {v.estado.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc3545",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  pdfButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  filterSection: {
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rangoButtons: {
    flexDirection: "row",
    gap: 10,
  },
  rangoBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  rangoBtnActive: {
    backgroundColor: "#0ab546",
    borderColor: "#0ab546",
  },
  rangoText: {
    color: "#555",
    fontWeight: "500",
  },
  rangoTextActive: {
    color: "#fff",
  },
  customDateContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 15,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },
  consultarBtn: {
    backgroundColor: "#0ab546",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCardsRow: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  methodBreakdown: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  methodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  methodName: {
    fontSize: 16,
    color: "#555",
  },
  methodAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  ventaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  ventaId: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
  },
  ventaDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  ventaTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  ventaStatus: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
  noDataText: {
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },
});
