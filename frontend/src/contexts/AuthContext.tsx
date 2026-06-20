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
    updateProfile: (userData: Partial<User> & { avatar?: File | string | null }) => Promise<boolean>;
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

            if (response && (response.user || response.token)) {
                // Toast is already shown by handleHttpErrors if there's a message
                // but we can add a specific one if needed, though handleHttpErrors usually handles it.
                setIsLoading(false);
                return true;
            } else {
                setIsLoading(false);
                return false;
            }
        }
        catch (error) {
            console.error("Erreur lors de la création de l'utilisateur:", error);
            setIsLoading(false);
            return false;
        }
    }

    const updateUser = async (userId: string, userData: CreateUserData): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await UserService.updateUser(userId, userData);

            if (response) {
                setIsLoading(false);
                return true;
            } else {
                setIsLoading(false);
                return false;
            }
        } catch (error) {
            console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
            setIsLoading(false);
            return false;
        }
    }

    const updateProfile = async (userData: Partial<User> & { avatar?: File | string | null }): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await UserService.updateProfile(userData);
            if (response) {
                localStorage.setItem('user', JSON.stringify(response));
                setUser(response);
                setIsLoading(false);
                return true;
            } else {
                setIsLoading(false);
                return false;
            }
        } catch (error) {
            console.error("Erreur lors de la mise à jour du profil:", error);
            setIsLoading(false);
            return false;
        }
    }
    const verifyItem = async (parameter:string, value: string) : Promise<boolean> => {
        // isLoading not set to true here to avoid global loading state on every keystroke
        try {
            return await UserService.verifyItem(parameter, value);
        } catch (error) {
            console.error("Erreur lors de la vérification:", error);
            return false;
        }
    }
    const verifyItems = async (nom:string, prenom:string) : Promise<boolean> =>{
        try {
            return await UserService.verifyItems(nom, prenom);
        } catch (error) {
            console.error("Erreur lors de la vérification:", error);
            return false;
        }
    }
    const getUsers = async (): Promise<User[]> => {
        setIsLoading(true);
        try {
            const response = await UserService.getUsers();
            setIsLoading(false);
            return response as unknown as User[];
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
            updateProfile,
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