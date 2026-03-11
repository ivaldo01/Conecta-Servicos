export function formatDate(timestamp) {
    if (!timestamp?.seconds) return "";

    const data = new Date(timestamp.seconds * 1000);

    return data.toLocaleDateString("pt-BR");
}