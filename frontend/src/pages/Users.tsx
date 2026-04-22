import { useState, useEffect } from "react";
import { Users as UsersIcon, UserPlus, Shield, Mail, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MetricCard } from "@/components/MetricCard";
import { UserManagementForm } from "@/components/UserManagementForm";
import { RoleManagementForm } from "@/components/RoleManagementForm";
import { UserService, RoleService, RoleResponse } from "@/services/api";
import { User, Role } from "@/types/user";
import { UserData } from "@/types/types";
import { useNavigate } from "react-router-dom";

// Fonctions utilitaires


//import { User, CreateUserData } from "@/types/user";

// Fonctions utilitaires
// const getNumbers = (users: any[]) => users.map((user) => user.id);
const getNumbers = (users) => users.map((user) => user.id);

const getActiveUsers = (users) => users.filter((user) => user.status === "active");

const getAdminUsers = (users) => users.filter((user) => user.role === "Administrator");

const getPendingUsers = (users) => users.filter((user) => user.status === "pending");

async function getUsers() {
  const response = await UserService.getUsers();
  // The API returns UserResponse[] but the actual data has user properties directly
  // We need to extract the user data from the response
  const usersData = (response as unknown as UserData[]);
  const personnes: User[] = usersData.map((user: UserData) => ({
    id: user.id as string,
    first_name: user.first_name as string,
    last_name: user.last_name as string,
    name: `${user.first_name} ${user.last_name}`,
    email: user.email as string,
    phone: (user.phone as string) || '',
    role: user.role as string,
    department: (user.department as string) || '',
    location: (user.location as string) || '',
    status: (user.status as string) || 'inactive',
    updated_at: user.updated_at as string | undefined,
    biography: (user.biography as string) || '',
  }));
  return personnes;
}

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleFormMode, setRoleFormMode] = useState<"create" | "edit">("create");
  const [users, setUsers] = useState<User[]>([]); // État pour stocker les utilisateurs
  const [roles, setRoles] = useState<Role[]>([]);
  
  const [isLoading, setIsLoading] = useState(true); // État pour gérer le chargement
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  // Récupérer les utilisateurs avec useEffect
  useEffect(() => {
    const getAllRole = FecthRoles();

    getAllRole();

    async function fetchUsers() {
      await fetcUsersglobal();
    }
    fetchUsers();
  }, []);

  const navigate = useNavigate();

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormMode("create");
    setIsUserFormOpen(true);
  };

  const handleShowPermissions = () => {
    navigate("/permissions");
  };

  // const handleEditUser = (user: any) => {
  //   setSelectedUser(user);
  //   setFormMode("edit");
  //   setIsUserFormOpen(true);
  // };
  const handleEditUser = (user: User) => {
    // Créer un nouvel objet utilisateur avec les champs attendus par le formulaire
    const userData = {
      ...user,
      // S'assurer que les champs requis sont présents
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      department: user.department || '',
      location: user.location || '',
      biography: user.biography || '',
      //permissions: user.permissions || [],
    };
    
    setSelectedUser(userData);
    setFormMode("edit");
    setIsUserFormOpen(true);


  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setRoleFormMode("create");
    setIsRoleFormOpen(true);
    FecthRoles()
  };

  const handleEditRole = (role) => {
    // Formater les données du rôle pour correspondre à la structure du formulaire
    const formattedRole = {
      id: role.id,
      name: role.name || '',
      description: role.description || '',
      prioritylevel: role.prioritylevel || 1,
      is_active: role.is_active ?? true,
      // Formater les permissions par catégorie
      dashboard_analytics: role.dashboard_analytics || [],
      inventory_management: role.inventory_management || [],
      user_management: role.user_management || [],
      ai_datamodels: role.ai_datamodels || [],
    };

    console.log("Role data being sent to form:", formattedRole); // Pour le debug
    setSelectedRole(formattedRole);
    setRoleFormMode("edit");
    const log = setIsRoleFormOpen(true);
    console.log(log);
    
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "pending":
        return <Badge className="bg-warning text-warning-foreground">Attente</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: { [key: string]: string } = {
      Administrator: "bg-red-100 text-red-800",
      "Stock Manager": "bg-blue-100 text-blue-800",
      "Business User": "bg-green-100 text-green-800",
      "Data Analyst": "bg-purple-100 text-purple-800",
    };
    return (
      <Badge variant="outline" className={colors[role] || "bg-gray-100 text-gray-800"}>
        {role}
      </Badge>
    );
  };

  // Filtrer les utilisateurs en fonction du terme de recherche
  const filteredUsers = users.filter(
    (user: User) =>
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérer les comptes d'utilisateurs, les rôles et les autorisations
          </p>
        </div>
        <Button className="text-white bg-bouton hover:bg-bouton-hover" variant="outline" onClick={handleAddUser}>
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* User Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Nombre total d'utilisateurs"
          value={getNumbers(users).length}
          trend={{ value: 3, label: "new this month" }}
          icon={<UsersIcon className="h-4 w-4" />}
        />
        <MetricCard
          title="Utilisateurs actifs"
          value={getActiveUsers(users).length}
          trend={{ value: 1, label: "vs last week" }}
          icon={<Shield className="h-4 w-4" />}
          variant="success"
        />
        <MetricCard
          title="Invitations en attente"
          value={getPendingUsers(users).length}
          trend={{ value: -1, label: "vs yesterday" }}
          icon={<Mail className="h-4 w-4" />}
          variant="warning"
        />
        <MetricCard
          title="Utilisateurs administrateurs"
          value={getAdminUsers(users).length}
          description="Administrateurs système"
          icon={<Shield className="h-4 w-4" />}
          variant="destructive"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Users Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Tous les utilisateurs</CardTitle>
              <CardDescription>
                Gérer les comptes utilisateurs et leurs autorisations d'accès
              </CardDescription>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Input
                    placeholder="Rechercher des utilisateurs par nom, e-mail ou rôle..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {/*<Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Invite User
                </Button>*/}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Dernière connexion</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Chargements...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Aucun utilisateur trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell>{user.updated_at}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2" onClick={() => handleEditUser(user)}>
                                  <Edit className="h-4 w-4" />
                                  Modifier l'utilisateur
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <Shield className="h-4 w-4" />
                                  Gérer les autorisations
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  Désactiver l'utilisateur
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roles Management */}
        <div>
            <Card>
            <CardHeader>
              <CardTitle>Rôles des utilisateurs</CardTitle>
              <CardDescription>Rôles et autorisations système disponibles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingRoles ? (
              <div className="flex items-center justify-center p-4">
                <span>Chargement des rôles...</span>
              </div>
              ) : roles && roles.length > 0 ? (
              roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">{role.name}</h4>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                  <div className="flex items-center gap-2">
                  <Badge variant={role.is_active ? "default" : "secondary"}>
                    {role.is_active ? "Actif" : "Inactif"}
                  </Badge>
                  <Badge variant="outline">
                    Priorité: {role.prioritylevel || 'N/A'}
                  </Badge>
                  {role.permissions && (
                    <Badge variant="outline" className="bg-blue-50">
                      {role.permissions.length} permissions
                    </Badge>
                  )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleEditRole(role)}>
                  <Edit className="h-4 w-4" />
                </Button>
                </div>
              ))
              ) : (
              <div className="text-center text-muted-foreground">
                <p>Aucun rôle trouvé</p>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(roles, null, 2)}
                </pre>
              </div>
              )}
              <Button className="w-full" variant="outline" onClick={handleCreateRole}>
              <UserPlus className="h-4 w-4 mr-2" />
              Créer un nouveau rôle
              </Button>
            </CardContent>
            </Card>

          {/* <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest user management activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>John Smith logged in</span>
                  <span className="text-muted-foreground">2 hours ago</span>
                </div>
                <div className="flex justify-between">
                  <span>Sarah Johnson updated profile</span>
                  <span className="text-muted-foreground">5 hours ago</span>
                </div>
                <div className="flex justify-between">
                  <span>New user invited</span>
                  <span className="text-muted-foreground">1 day ago</span>
                </div>
                <div className="flex justify-between">
                  <span>Role permissions updated</span>
                  <span className="text-muted-foreground">2 days ago</span>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>

      <UserManagementForm
        open={isUserFormOpen}
        onClose={() => {
          setIsUserFormOpen(false);
          setSelectedUser(null); // Réinitialiser l'utilisateur sélectionné
        }}
        user={selectedUser}
        mode={formMode}
        onSuccess ={() => {fetcUsersglobal()}}
      />

      <RoleManagementForm
        open={isRoleFormOpen}
        onClose={() => {
          FecthRoles()
          setIsRoleFormOpen(false); 
        }}
        role={selectedRole}
        mode={roleFormMode}
        onSuccess={FecthRoles()}
      />
    </div>
  );

  async function fetcUsersglobal() {
    try {
      setIsLoading(true);
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
      // console.log("Utilisateurs récupérés :", fetchedUsers);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs :", error);
    } finally {
      setIsLoading(false);
    }
  }

  function FecthRoles() {
    
    return async () => {
      try {
        setIsLoadingRoles(true);
        const response = await RoleService.getRoles();
        console.log("Response from getRoles:", response); // Pour debug
        
        // Extraire les rôles de la réponse
        let rolesData: Role[] = [];
        if (response.data) {
          rolesData = Array.isArray(response.data) ? response.data : [response.data];
        }
        setRoles(rolesData);
        // console.log("reloaded");
      } catch (error) {
        console.error("Erreur lors de la récupération des rôles:", error);
        setRoles([]);
      } finally {
        setIsLoadingRoles(false);
      }
    };
  }
}