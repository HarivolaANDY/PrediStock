import { createContext, useContext, useState, useEffect } from "react";
import { UserService } from "@/services/api";
import { CreateUserData, User } from "@/types/types";
import { useToast } from "@/components/ui/use-toast";

interface LoginData {
    email: string;
    password: string;
}

interface AuthContextType {
    createUser: (userData: CreateUserData) => Promise<boolean>;
    updateUser: (userId: string, userData: CreateUserData) => Promise<boolean>;
    isLoading: boolean;
    verifyItem : (parameter:string, value:string) => Promise<boolean>;
    verifyItems : (nom:string, prenom:string) => Promise<boolean>;
    getUsers : () => Promise<User[]>;
    user: User | null;
    login: (loginData: LoginData) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const {toast} = useToast();

    // Vérifier la session au chargement
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                console.log("Session restaurée:", parsedUser);
            } catch (error) {
                console.error("Erreur lors de la restauration de la session:", error);
                localStorage.removeItem('user');
            }
        }
    }, []);

    const login = async (loginData: LoginData): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await UserService.Login(loginData);
            if (response.token && response.user) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                setUser(response.user);
                console.log("Connexion réussie:", response.user);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Erreur de connexion:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        console.log("Déconnexion effectuée");
        toast({
            title: "Déconnexion réussie",
            description: "Vous avez été déconnecté avec succès."
        });
    };

    const createUser = async (userData: CreateUserData): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await UserService.createUser(userData)

            if (response.success) {
                toast({
                    title: "Utilisateur créé avec succès.",
                    description: "Le nouvelle utilisateur a été ajouté avec succès."
                })

                setIsLoading(false);
                return true;
        } else {
            toast({
                variant: 'destructive',
                title: 'Échec de la création de l\'utilisateur',
                description: response.message || "Une erreur s'est produite lors de la création de l'utilisateur."
            })

            setIsLoading(false);
            return false;
            }
        }
        catch (error) {
            console.error("Erreur lors de la création de l'utilisateur:", error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Une erreur s'est produite lors de la création de l'utilisateur."
            })
            setIsLoading(false);
            return false;
        }
    }

    const updateUser = async (userId: string, userData: CreateUserData): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await UserService.updateUser(userId, userData);

            if (response.success) {
                toast({
                    title: "Utilisateur mis à jour avec succès.",
                    description: "Les informations de l'utilisateur ont été mises à jour avec succès."
                });

                setIsLoading(false);
                return true;
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Échec de la mise à jour de l\'utilisateur',
                    description: response.message || "Une erreur s'est produite lors de la mise à jour de l'utilisateur."
                });

                setIsLoading(false);
                return false;
            }
        } catch (error) {
            console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Une erreur s'est produite lors de la mise à jour de l'utilisateur."
            });
            setIsLoading(false);
            return false;
        }
    }
    const verifyItem = async (parameter:string, value: string) : Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await UserService.verifyItem(parameter, value);
            if (response) {
                // toast({
                //     title: "Vérification réussie.",
                //     description: "L'élément a été vérifié."
                // });
                setIsLoading(false);
                return true;
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Échec de la vérification',
                    description: response || "Une erreur s'est produite lors de la vérification."
                });
                setIsLoading(false);
                return false;
            }
        } catch (error) {
            console.error("Erreur lors de la vérification:", error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Quelque chose s'est produite lors de la vérification."
            });
            setIsLoading(false);
            return false;
        }
    }
    const verifyItems = async (nom:string, prenom:string) : Promise<boolean> =>{
        setIsLoading(true);
        try {
            const response = await UserService.verifyItems(nom, prenom);
            if (response) {
                // toast({
                //     title: "Vérification réussie.",
                //     description: "L'élément a été vérifié."
                // });
                setIsLoading(false);
                return true;
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Échec de la vérification',
                    description: response || "Une erreur s'est produite lors de la vérification."
                });
                setIsLoading(false);
                return false;
            }
        } catch (error) {
            console.error("Erreur lors de la vérification:", error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Quelque chose s'est produite lors de la vérification."
            });
            setIsLoading(false);
            return false;
        }
    }
    const getUsers = async (): Promise<User[]> => {
        setIsLoading(true);
        try {
            const response = await UserService.getUsers();
            setIsLoading(false);
            return response;
        } catch (error) {
            console.error("Erreur lors de la récupération des utilisateurs:", error);
            setIsLoading(false);
            return [];
        }
    }
    return (
        <AuthContext.Provider value={{
            createUser,
            updateUser,
            isLoading,
            verifyItem,
            verifyItems,
            getUsers,
            user,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}