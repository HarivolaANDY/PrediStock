import {
  X,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
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

// Type Report
type Report = {
  id: string
  name: string
  type?: string
  description?: string
  format?: string
  size?: string
  created_at?: string
  status?:string
}

interface ReportsDetailsModalProps {
  report: Report;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (report: Report) => void;
}

export function ReportsDetails({
  report,
  isOpen,
  onClose,
  onDelete,
}: ReportsDetailsModalProps) {
  if (!isOpen) return null; // <-- pour éviter d'afficher la modal si fermée

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? "default" : "destructive"}>
        {isActive ? "Actif" : "Inactif"}
      </Badge>
    );
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{report.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <Calendar className="h-4 w-4" />
                <span>Créé le {formatDate(report.created_at)}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(report.status === "Actif")}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">
                Informations sur le rapport
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">
                      {report.type || "Non renseigné"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Format</p>
                    <p className="font-medium">
                      {report.format || "Non renseignée"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Taille</p>
                    <p className="font-medium">
                      {report.size || "Non renseignée"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Etat</p>
                    <p className="font-medium">
                      {report.status || "Non renseignée"}
                    </p>
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
              onClick={() => onDelete(report)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}