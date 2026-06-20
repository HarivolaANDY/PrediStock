import React, { useState, useEffect } from 'react';
import API from '../services/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Activity, Clock, User, TrendingUp, Download, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: number;
  action: string;
  details: string;
  date: string;
}

const ActivityMonitor = () => {
  const [activite, setActivite] = useState<ActivityItem[]>([]);
  const [filteredActivite, setFilteredActivite] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {    
    const fetchActivite = async () => {
      try {
        const response = await API.get('notifications/activites/');
        const apiData = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.data)
            ? response.data.data.reverse()
            : [];
        setActivite(apiData);
        setFilteredActivite(apiData);
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement des activités');
        console.error(err);
        // Mock data for demo
        const mockData: ActivityItem[] = [
          { id: 1, action: "Connexion utilisateur", details: "admin@example.com s'est connecté", date: new Date().toISOString() },
          { id: 2, action: "Modification profil", details: "Jean Dupont a mis à jour son profil", date: new Date(Date.now() - 3600000).toISOString() },
          { id: 3, action: "Création document", details: "Nouveau rapport Q4 créé", date: new Date(Date.now() - 7200000).toISOString() },
          { id: 4, action: "Suppression fichier", details: "Document temporaire supprimé", date: new Date(Date.now() - 10800000).toISOString() },
          { id: 5, action: "Modification paramètres", details: "Configuration email mise à jour", date: new Date(Date.now() - 14400000).toISOString() },
        ];
        setActivite(mockData);
        setFilteredActivite(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchActivite();
  }, []);

  useEffect(() => {
    const filtered = activite.filter(
      (item) =>
        item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.details.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredActivite(filtered);
  }, [searchTerm, activite]);

  const getActivityIcon = (action: string) => {
    if (action.toLowerCase().includes('connexion')) return '🔐';
    if (action.toLowerCase().includes('création')) return '✨';
    if (action.toLowerCase().includes('modification')) return '✏️';
    if (action.toLowerCase().includes('suppression')) return '🗑️';
    return '📋';
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-subtle">
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Chargement des activités...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* En-tête simplifié */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Surveillance des Activités</h1>
          <p className="text-slate-500 mt-1">
            Suivez toutes les actions en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <Clock className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button className="gradient-primary text-white">
            <Download className="h-4 w-4 mr-2" />
            Exporter le Journal
          </Button>
        </div>
      </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 border-0 bg-card/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Activités</p>
                  <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {activite.length}
                  </p>
                </div>
                <div className="p-4 rounded-xl gradient-primary">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 border-0 bg-card/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Aujourd'hui</p>
                  <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                    {filteredActivite.filter(a => {
                      const today = new Date().setHours(0, 0, 0, 0);
                      const actDate = new Date(a.date).setHours(0, 0, 0, 0);
                      return actDate === today;
                    }).length}
                  </p>
                </div>
                <div className="p-4 rounded-xl gradient-accent">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elegant transition-all duration-300 border-0 bg-card/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Acteurs Uniques</p>
                  <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                    {new Set(activite.map(a => a.action)).size}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-secondary to-primary">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Recherche
            </CardTitle>
            <CardDescription>
              Filtrez les activités par action ou détails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une activité..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 focus:border-primary transition-colors"
              />
            </div>
          </CardContent>
        </Card>

        {/* Activities Timeline */}
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Journal d'Activités</CardTitle>
              <CardDescription>
                {filteredActivite.length} activité{filteredActivite.length > 1 ? 's' : ''} trouvée{filteredActivite.length > 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Button className="gradient-primary text-white shadow-elegant hover:shadow-glow transition-all">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </CardHeader>
          <CardContent>
            {filteredActivite.length > 0 ? (
              <div className="space-y-4">
                {filteredActivite.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="group relative flex gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/50 to-transparent hover:from-muted hover:shadow-card transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-2xl shadow-elegant group-hover:shadow-glow transition-all">
                        {getActivityIcon(activity.action)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {activity.action}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.details}
                          </p>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {getRelativeTime(activity.date)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert className="border-accent/20 bg-accent/5">
                <AlertCircle className="h-4 w-4 text-accent" />
                <AlertTitle>Aucun résultat</AlertTitle>
                <AlertDescription>
                  Aucune activité ne correspond à votre recherche.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
  );
};

export default ActivityMonitor;
