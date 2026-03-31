import React, { useState, useEffect } from 'react';
import API from '../services/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from './ui/button';

import { Page, Text, View, Document, StyleSheet, pdf } from '@react-pdf/renderer';
// import ReactPDF from '@react-pdf/renderer';
import MyDocument from './ActivityReport';


// Create Document Component
// const MyDocument = () => <MyDocument/>;


const ActiviteList = () => {
  const [activite, setActivite] = useState([]);
  const [filteredActivite, setFilteredActivite] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [element, setElement] = useState<HTMLTableElement>(null);
  // const GenerateHtml = () =>{
  //   if (element) {
  //     const genere = html2pdf().from(element).toPdf().save('rapport.pdf');
  //     alert("pdf")
  //   }
  //   else{
  //     alert("element null")
  //   }
  // }


  useEffect(() => {    
    const fetchActivite = async () => {
      try {
        const response = await API.get('activite/');
        const apiData = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.data.reverse())
            ? response.data.data
            : [];
        setActivite(apiData);
        setFilteredActivite(apiData); // Initialisation des données filtrées
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement des activités');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivite();
  }, []);

  // Gestion du filtrage
  useEffect(() => {
    const filtered = activite.filter(
      (item) =>
        item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.details.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredActivite(filtered);
  }, [searchTerm, activite]);

  // Affichage pendant le chargement
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activités récentes</h1>
        <p className="text-muted-foreground">
          Consultez et filtrez vos activités récentes
        </p>
      </div>

      {/* Filtre */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrer les activités</CardTitle>
          <CardDescription>
            Recherchez des activités par action ou détails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="search">Recherche</Label>
            <Input
              id="search"
              placeholder="Rechercher par action ou détails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des activités */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des activités</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivite.length > 0 ? (
            <div className="overflow-x-auto">
              <Table ref={setElement} id="rapport_table">
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Acteur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivite.map((activite, index) => (
                    <TableRow key={activite.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{activite.action}</TableCell>
                      <TableCell className="text-muted-foreground">{activite.details}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(activite.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{activite.user.username}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>Aucune activité pour le moment.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <Button onClick={DownloadRapport}>Générer le rapport</Button>

    </div>
  );
};

export default ActiviteList;

function DownloadRapport() {
  pdf(<MyDocument />).toBlob().then((blob) => {
    // Créer une URL pour le blob
    const url = window.URL.createObjectURL(blob);

    // Créer un élément <a> temporaire
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'document.pdf'); // Nom du fichier téléchargé


    // Ajouter le lien au DOM (nécessaire pour certains navigateurs)
    document.body.appendChild(link);

    // Déclencher le téléchargement
    link.click();

    // Nettoyer : supprimer le lien et l'URL
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('Téléchargement du PDF démarré', blob);
  }).catch((error) => {
    console.error('Erreur lors de la génération ou du téléchargement du PDF :', error);
  });
}
