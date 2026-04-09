import React from "react";
import { View } from "react-native";

export default function AdBanner({ enabled = true }) {
    // Se anúncios estiverem desabilitados (usuário com plano pago), não mostrar
    if (!enabled) {
        return null;
    }
    // Retorna null na web para evitar erros de módulos nativos
    return null;
}
