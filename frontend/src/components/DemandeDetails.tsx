import React from "react";
import {
  X,
  User,
  Clock,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Type Demandes
type Demandes = {
  id: string;
  utilisateur: string;
  action: string;
  date: string;
  statut: string;
  documentId: string;
  documentTitre: string;
};

interface DemandeDetailsModalProps {
  demande: Demandes;
  isOpen: boolean;
  onClose: () => void;
}

export function DemandeDetails({
  demande,
  isOpen,
  onClose,
}: DemandeDetailsModalProps) {
  if (!isOpen) return null;

  const getStatusBadge = (statut: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" } = {
      "En attente": "secondary",
      "Approuvée": "default",
      "Refusée": "destructive"
    };

    return (
      <Badge variant={variants[statut] || "default"}>
        {statut}
      </Badge>
    );
  };

  const document = {
    id: "DOC123",
    titre: "Rapport Annuel 2023",
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Détails de la demande</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <Calendar className="h-4 w-4" />
                <span>Demande #{demande.id}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(demande.statut)}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/**Utilisateur, Action, Date */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">
                Informations sur l'utilisateur
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Utilisateur</p>
                    <p className="font-medium">{demande.utilisateur}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Action</p>
                    <p className="font-medium">{demande.action}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{demande.date}</p>
                  </div>
                </div>
                
              </div>
            </div>

            {/**Document */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">
                Document
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Id</p>
                    <p className="font-medium">DOC-123</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Titre</p>
                    <p className="font-medium">Rapport annuel 2023</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">PDF</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Fermer
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Rejeter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
