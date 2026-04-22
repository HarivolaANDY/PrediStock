import { useState, useEffect } from "react"
import { UserPlus, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from "@/components/ui/use-toast"
import { UserService } from "@/services/api"
import { ToastService } from "@/services/toast.service"
import { User } from "@/types/types"
import { isAxiosError } from "axios"

interface UserManagementFormProps {
  open: boolean
  onClose: () => void
  user?: User
  mode: 'create' | 'edit'
  onSuccess?: () => void
}

interface UserFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  location: string;
  biography: string;
  status: string;
  permissions: string[];
  sendInvite: boolean;
  temporaryPassword: boolean;
}

const defaultFormData: UserFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: '',
  department: '',
  location: '',
  biography: '',
  status: 'active',
  permissions: [],
  sendInvite: true,
  temporaryPassword: true
}

// Removed redundant Users component

export function UserManagementForm({ open, onClose, user, mode, onSuccess }: UserManagementFormProps): React.JSX.Element {
  const { createUser, updateUser, isLoading } = useAuth()
  const { toast } = useToast()
  const [formData, setFormData] = useState<UserFormData>(() => {
    if (mode === 'edit' && user) {
      const permissions = typeof user.permissions === 'string' 
            ? user.permissions.split(',').filter(Boolean)
            : (Array.isArray(user.permissions) ? user.permissions.map(String) : []);
            
      return {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        department: user.department || '',
        location: user.location || '',
        biography: user.biography || '',
        status: user.status || 'active',
        permissions: permissions,
        sendInvite: false,
        temporaryPassword: false
      }
    }
    return defaultFormData
  })

  // Réinitialiser le formulaire quand le mode ou l'utilisateur change
  useEffect(() => {
    if (mode === 'edit' && user) {
      const permissions = typeof user.permissions === 'string' 
            ? user.permissions.split(',').filter(Boolean)
            : (Array.isArray(user.permissions) ? user.permissions.map(String) : []);

      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        department: user.department || '',
        location: user.location || '',
        biography: user.biography || '',
        status: user.status || 'active',
        permissions: permissions,
        sendInvite: false,
        temporaryPassword: false
      })
    } else if (mode === 'create') {
      setFormData(defaultFormData)
    }
  }, [mode, user])

  const roles = [
    { value: 'Administrateur', label: 'Administrateur', description: 'Accès complet au système' },
    { value: 'Gestionnaire de Stock', label: 'Gestionnaire de Stock', description: 'Gestionnaire de Stock' },
    { value: 'Utilisateur professionnel', label: 'Utilisateur Professionnel', description: 'Rapports et Tableaux de bord' },
    { value: 'Analyste de Données', label: 'Analyste de Données', description: 'Données et Modèles IA' }
  ]

  const department = [
    { value: 'Analakely', label: 'Analakely' },
    { value: 'Ambanidia', label: 'Ambanidia' },
    { value: 'Antaninandro', label: 'Antaninandro' },
    { value: 'Mahamasina', label: 'Mahamasina' },
    { value: 'Ambatomainty', label: 'Ambatomainty' },
    { value: 'Ankorondrano', label: 'Ankorondrano' },
    { value: 'Anosy', label: 'Anosy' }
  ]

  const permissions = [
    { id: 'dashboard_view', label: 'Accès au tableau de bord', description: 'Afficher le tableau de bord principal' },
    { id: 'inventory_view', label: "Vue d'inventaire", description: "Afficher les données d'inventaire" },
    { id: 'forecasting_view', label: 'Accès aux prévisions', description: 'Accéder aux outils de prévision' },
    { id: 'reports_generate', label: 'Générer des rapports', description: 'Créer et exporter des rapports' },
    { id: 'user_management', label: "Gestion d'utilisateurs", description: 'Gérer les comptes utilisateurs' },
    { id: 'system_settings', label: 'Paramètres système', description: 'Configurer les paramètres du système' },
    { id: 'data_import', label: 'Importation de données', description: 'Importer les données externes' },
    { id: 'models_configure', label: "Modèles d'IA", description: "Configurer les modèles d'IA" }
  ]

  const [phoneError, setPhoneError] = useState<string>("");

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+261\s(32|33|34|37|38|39)\s\d{2}\s\d{3}\s\d{2}$/;
    return phoneRegex.test(phone);
  };

  const formatPhoneNumber = (value: string): string => {
    // Si la valeur est vide ou uniquement "+", retourner une chaîne vide
    if (!value || value === '+') return '';
    
    // Supprime tous les espaces et caractères non désirés
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // Si l'utilisateur essaie de supprimer des chiffres après +261
    if (cleaned.length <= 4) {
      // Garder seulement +261b
      cleaned = '+261';
    }
    
    // Ajoute +261 au début si ce n'est pas déjà présent
    if (!cleaned.startsWith('+261')) {
      if (cleaned.startsWith('0')) {
        cleaned = '+261' + cleaned.slice(1);
      } else if (!cleaned.startsWith('+')) {
        cleaned = '+261' + cleaned;
      }
    }

    // Format: +261 XX XX XXX XX
    if (cleaned.length >= 4) {
      cleaned = cleaned.slice(0, 4) + ' ' + cleaned.slice(4);
    }
    if (cleaned.length >= 7) {
      cleaned = cleaned.slice(0, 7) + ' ' + cleaned.slice(7);
    }
    if (cleaned.length >= 10) {
      cleaned = cleaned.slice(0, 10) + ' ' + cleaned.slice(10);
    }
    if (cleaned.length >= 14) {
      cleaned = cleaned.slice(0, 14) + ' ' + cleaned.slice(14);
    }

    // Si on a moins que +261, retourner +261
    if (cleaned.length < 4) {
      return '+261';
    }

    return cleaned;
  };

  // Modifier la fonction validateForm existante
  const validateForm = async (): Promise<boolean> => {
    const errors: string[] = [];

    if (!formData.first_name.trim()) {
      errors.push("Le nom est requis");
    }
    if (!formData.last_name.trim()) {
      errors.push("Le prénom est requis");
    }
    if (!formData.email.trim()) {
      errors.push("L'email est requis");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("Un email valide est requis");
    }
    // Vérification du nom (username)
    // if (formData.first_name && formData.last_name) {
    //   const nameExists = await UserService.verifyItems(formData.last_name, formData.first_name);
    //   if (!nameExists) {
    //     errors.push("Ce nom existe déjà");
    //   }
    // }
    if (!formData.role) {
      errors.push("Le rôle est requis")
    }
    if (!formData.department) {
      errors.push("Le département est requis")
    }
    if (mode === 'create' && !formData.temporaryPassword) {
      errors.push("Un mot de passe temporaire est requis pour la création")
    }
    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      errors.push("Le format du numéro de téléphone est invalide")
    }

    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: (
          <ul className="list-disc pl-4">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!(await validateForm())) return

    try {
        const permissionsArray = Array.isArray(formData.permissions) 
            ? formData.permissions.map(p => String(p))
            : [];

        const userData = { 
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            role: formData.role,
            department: formData.department,
            location: formData.location.trim(),
            biography: formData.biography.trim(),
            status: formData.status,
            permissions: permissionsArray,
            sendInvite: Boolean(formData.sendInvite),
            temporaryPassword: mode === 'create' ? true : Boolean(formData.temporaryPassword)
        };

        if (mode === 'create') {
            const response = await createUser(userData);
            if (response) {
              toast({
                title: "Succès",
                description: "L'utilisateur a été créé avec succès"
              })
              if (onSuccess) onSuccess()
              onClose()
            }
        } else if (mode === 'edit' && user?.id) {
            const response = await updateUser(String(user.id), userData);
            if (response) {
              toast({
                title: "Succès",
                description: "L'utilisateur a été mis à jour avec succès"
              })
              if (onSuccess) onSuccess()
              onClose()
            }
        }
    } catch (error: unknown) {
      console.error('Erreur:', error)
      let message = "Une erreur est survenue lors de l'enregistrement."
      
      if (isAxiosError(error)) {
        const data = error.response?.data
        if (data && typeof data === 'object') {
          const errors = data.errors || data
          const errorList = Object.entries(errors).map(([f, m]) => `${f}: ${m}`)
          message = errorList.length > 0 ? errorList.join(', ') : message
        }
      } else if (error instanceof Error) {
        message = error.message
      }

      toast({
        variant: "destructive",
        title: "Erreur",
        description: message
      })
    }
  }

  // Component logic ends here

  const togglePermission = (permissionId: string): void => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p: string) => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  // Ajouter un useEffect pour réinitialiser le formulaire quand le dialog se ferme
  useEffect(() => {
    if (!open) {
      setFormData(defaultFormData)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'edit' ? (
              <>
                <UserPlus className="h-5 w-5" />
                Modifier l'utilisateur
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Ajouter un nouvel utilisateur
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? "Modifier les informations, les rôles et les autorisations de l'utilisateur"
              : 'Créez un nouveau compte utilisateur et attribuez des rôles et des autorisations'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informations de base</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => {setFormData(prev => ({ ...prev, last_name: e.target.value }));}}
                  placeholder="Entrez le nom complet"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={async (e) => {
                    setFormData(prev => ({ ...prev, first_name: e.target.value }));
                    if (mode === 'create')
                    {
                      const verification = await UserService.verifyItems(formData.last_name, e.target.value);
                      if (!verification) {
                        ToastService.error("Combinaison de Nom et Prénom déjà utilisé");
                      }
                    }
                }}
                  placeholder="Entrez le prénom"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={async (e) => {
                    const formattedNumber = formatPhoneNumber(e.target.value);

                    if (mode === 'create')
                    {
                      const verification = await UserService.verifyItem("phone", formattedNumber);
                      if (!verification) {
                        ToastService.error("Numéro de téléphone déjà utilisé");
                      }
                    }
                    setFormData(prev => ({ ...prev, phone: formattedNumber }));
                    
                    if (formattedNumber.length >= 13) {
                      if (!validatePhoneNumber(formattedNumber)) {
                        setPhoneError("Le numéro doit commencer par +261 suivi de 32, 33, 34, 37, 38 ou 39");
                      } else {
                        setPhoneError("");
                      }
                    } else {
                      setPhoneError("Le numéro doit contenir 13 caractères");
                    }
                  }}
                  placeholder="+261 3X XXXXXXX"
                  className={phoneError ? "border-red-500" : ""}
                />
                {phoneError && (
                  <p className="text-sm text-red-500 mt-1">
                    {phoneError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={async (e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }))
                    console.log(mode);
                    
                    if (mode == 'create')
                    {
                      const verification = await UserService.verifyItem("email", e.target.value);
                      
                      if (!verification) {
                        ToastService.error("Adresse e-mail déjà utilisée");
                      }
                    }
                  }}
                  placeholder="Entrez l'adresse e-mail"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Emplacement</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Entrez l'emplacement"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Département</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un département" />
                  </SelectTrigger>
                  <SelectContent>
                    {department.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        <div className="flex flex-col">
                          <span>{dept.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="biography">Biographie</Label>
              <Textarea
                id="biography"
                value={formData.biography}
                onChange={(e) => setFormData(prev => ({ ...prev, biography: e.target.value }))}
                placeholder="Brève description de l'utilisateur"
                rows={3}
              />
            </div>
          </div>

          {/* Role & Access */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Rôle & Accès</h3>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle de l'utilisateur</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col">
                        <span>{role.label}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Autorisations</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">{permission.label}</Label>
                      <p className="text-xs text-muted-foreground">{permission.description}</p>
                    </div>
                    <Switch
                      checked={formData.permissions.includes(permission.id)}
                      onCheckedChange={() => togglePermission(permission.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Paramètres du compte</h3>
            {mode === 'edit' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Statut du compte</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {mode === 'create' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Envoyer un e-mail d'invitation</Label>
                    <p className="text-sm text-muted-foreground">
                      Envoyer une invitation par e-mail à l'utilisateur
                    </p>
                  </div>
                  <Switch
                    checked={formData.sendInvite}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendInvite: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Générer un mot de passe temporaire</Label>
                    <p className="text-sm text-muted-foreground">
                      Créer un mot de passe temporaire pour l'utilisateur
                    </p>
                  </div>
                  <Switch
                    checked={formData.temporaryPassword}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, temporaryPassword: checked }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              className="text-white bg-bouton hover:bg-bouton-hover"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Création...' : 'Mise à jour...'}
                </div>
              ) : (
                mode === 'create' ? 'Créer un utilisateur' : "Mettre à jour l'utilisateur"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}