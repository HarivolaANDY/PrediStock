import { useState, useRef, useEffect } from "react"
import { Mail, Phone, MapPin, Calendar, Edit, Save, X, Camera } from "lucide-react"
import { User, Role } from "@/types/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"

export default function Profile() {
  const { user, updateProfile: updateProfileContext } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [userInfo, setUserInfo] = useState<User>(user || JSON.parse(localStorage.getItem('user') || '{}'))
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const baseUrl = "http://localhost:8000";

  useEffect(() => {
    if (user) {
      setUserInfo(user);
    }
  }, [user]);

  useEffect(() => {
    if (userInfo.avatar) {
      const url = userInfo.avatar.startsWith('http') ? userInfo.avatar : `${baseUrl}${userInfo.avatar}`;
      setAvatarPreview(url);
    }
  }, [userInfo.avatar]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    try {
      const { avatar, ...restOfUserInfo } = userInfo;
      const updateData: any = {
        ...restOfUserInfo
      };
      
      if (avatarFile) {
        updateData.avatar = avatarFile;
      }

      // Supprimer les champs qui ne doivent pas être envoyés ou qui sont gérés autrement
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.updated_at;
      delete updateData.permissions;
      delete updateData.date_joined;
      delete updateData.last_login;
      delete updateData.is_superuser;
      delete updateData.is_staff;
      delete updateData.is_active;

      if (typeof updateData.role === 'object' && updateData.role !== null) {
        updateData.role = (updateData.role as Role).name;
      }

      const success = await updateProfileContext(updateData);
      
      if (success) {
        setIsEditing(false);
        setAvatarFile(null);
        toast.success('Profil mis à jour avec succès !');
      } else {
        toast.error('Erreur lors de la sauvegarde du profil');
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error('Erreur lors de la mise à jour du profil');
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (user) setUserInfo(user)
    setAvatarFile(null)
    if (userInfo.avatar) {
        const url = userInfo.avatar.startsWith('http') ? userInfo.avatar : `${baseUrl}${userInfo.avatar}`;
        setAvatarPreview(url);
    } else {
        setAvatarPreview(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mon Profil</h1>
          <p className="text-muted-foreground">
            Gérez vos informations personnelles
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier le Profil
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative group">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={avatarPreview || undefined} alt={userInfo.last_name} />
                    <AvatarFallback className="text-2xl">
                      {userInfo.first_name?.[0]}{userInfo.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleAvatarChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{userInfo.first_name} {userInfo.last_name}</h3>
                  <Badge variant="secondary">{typeof userInfo.role === 'string' ? userInfo.role : (userInfo.role as any)?.name}</Badge>
                  <p className="text-sm text-muted-foreground">{userInfo.department}</p>
                </div>

                <div className="space-y-2 text-sm w-full">
                  <div className="flex items-center gap-2 justify-center">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{userInfo.email}</span>
                  </div>
                  {userInfo.phone && (
                    <div className="flex items-center gap-2 justify-center">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{userInfo.phone}</span>
                    </div>
                  )}
                  {userInfo.location && (
                    <div className="flex items-center gap-2 justify-center">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{userInfo.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 justify-center">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Inscrit le {userInfo.date_joined ? new Date(userInfo.date_joined).toLocaleDateString() : 'Inconnu'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Résumé de l'activité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Rapports générés</span>
                  <span className="font-medium">47</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Prévisions créées</span>
                  <span className="font-medium">156</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Produits gérés</span>
                  <span className="font-medium">324</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Dernière connexion</span>
                  <span className="font-medium">Aujourd'hui</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Infos Personnelles</TabsTrigger>
              <TabsTrigger value="security">Sécurité</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Informations Personnelles</CardTitle>
                  <CardDescription>
                    Mettez à jour vos coordonnées et informations personnelles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">Prénom</Label>
                      <Input
                        id="first-name"
                        value={userInfo.first_name}
                        onChange={(e) => setUserInfo((prev: User) => ({ ...prev, first_name: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Nom</Label>
                      <Input
                        id="last-name"
                        value={userInfo.last_name}
                        onChange={(e) => setUserInfo((prev: User) => ({ ...prev, last_name: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userInfo.email}
                        onChange={(e) => setUserInfo((prev: User) => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="departement">Département</Label>
                      <Input
                        id="departement"
                        type="text"
                        value={userInfo.department || ''}
                        onChange={(e) => setUserInfo((prev: User) => ({ ...prev, department: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        value={userInfo.phone || ''}
                        onChange={(e) => setUserInfo((prev: User) => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Localisation</Label>
                      <Input
                        id="location"
                        value={userInfo.location || ''}
                        onChange={(e) => setUserInfo((prev: User) => ({ ...prev, location: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Biographie</Label>
                    <Textarea
                      id="bio"
                      rows={4}
                      value={userInfo.biography || ''}
                      onChange={(e) => setUserInfo((prev: User) => ({ ...prev, biography: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Parlez-nous de vous..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de Sécurité</CardTitle>
                  <CardDescription>
                    Gérez la sécurité de votre compte et vos accès
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Mot de passe</h4>
                        <p className="text-sm text-muted-foreground">Dernière modification il y a 3 mois</p>
                      </div>
                      <Button variant="outline" size="sm">Changer le mot de passe</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Authentification à deux facteurs</h4>
                        <p className="text-sm text-muted-foreground">Ajoutez une couche de sécurité supplémentaire</p>
                      </div>
                      <Button variant="outline" size="sm">Activer la 2FA</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Sessions actives</h4>
                        <p className="text-sm text-muted-foreground">Gérez vos sessions actives</p>
                      </div>
                      <Button variant="outline" size="sm">Voir les sessions</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Clés API</h4>
                        <p className="text-sm text-muted-foreground">Gérez vos clés d'accès API</p>
                      </div>
                      <Button variant="outline" size="sm">Gérer les clés</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}