import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    backgroundColor: '#f9fafb',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1f2937',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 5,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
    color: '#4b5563',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    fontSize: 12,
    padding: 10,
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  tableCell: {
    fontSize: 11,
    padding: 10,
    flex: 1,
    textAlign: 'center',
    color: '#4b5563',
  },
});

const ActivityReport = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Rapport d'Activité</Text>
      
      <View style={styles.section}>
        <Text style={styles.subtitle}>Section #1 : Statistiques</Text>
        <Text style={styles.text}>Nombre d'actions : 42</Text>
        <Text style={styles.text}>Utilisateurs actifs : 17</Text>
        <Text style={styles.text}>Taux de réussite : 89%</Text>
        <Text style={styles.text}>Durée moyenne par action : 5.3 min</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.subtitle}>Section #2 : Dernières Activités</Text>
        <Text style={styles.text}>- Import de produits le 12/06/2024</Text>
        <Text style={styles.text}>- Export PDF généré le 13/06/2024</Text>
        <Text style={styles.text}>- Mise à jour du stock le 14/06/2024</Text>
        <Text style={styles.text}>- Validation des données le 15/06/2024</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.subtitle}>Section #3 : Détails d'Exportation</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableHeader}>Date</Text>
            <Text style={styles.tableHeader}>Type</Text>
            <Text style={styles.tableHeader}>Utilisateur</Text>
            <Text style={styles.tableHeader}>Statut</Text>
            <Text style={styles.tableHeader}>Volume</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>12/06/2024</Text>
            <Text style={styles.tableCell}>CSV</Text>
            <Text style={styles.tableCell}>Jean Dupont</Text>
            <Text style={styles.tableCell}>Succès</Text>
            <Text style={styles.tableCell}>1,245 lignes</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>13/06/2024</Text>
            <Text style={styles.tableCell}>PDF</Text>
            <Text style={styles.tableCell}>Marie Curie</Text>
            <Text style={styles.tableCell}>Succès</Text>
            <Text style={styles.tableCell}>3,120 lignes</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>14/06/2024</Text>
            <Text style={styles.tableCell}>JSON</Text>
            <Text style={styles.tableCell}>Paul Martin</Text>
            <Text style={styles.tableCell}>Échec</Text>
            <Text style={styles.tableCell}>0 lignes</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.subtitle}>Section #4 : Résumé</Text>
        <Text style={styles.text}>Le système a traité un total de 42 actions au cours de la dernière semaine, avec un taux de réussite global de 89%. Les exportations de données ont été principalement effectuées en formats CSV et PDF, avec un volume total de 4,365 lignes exportées avec succès.</Text>
      </View>
    </Page>
  </Document>
);

export default ActivityReport;