import {
  CreateUserData,
  UserResponse,
  CreateProductData,
  ProductResponse,
  CreateSupplierData,
  SupplierResponse,
  Category,
  CategoryCreateData,
  ApiResponse,
} from "@/types/types";

export interface RoleData {
  name: string;
  description?: string;
  permissions?: string[];
  [key: string]: unknown;
}

export interface RoleResponse {
  success: boolean;
  message: string;
  data?:
    | {
        id: string;
        name: string;
        description?: string;
        permissions?: string[];
      }
    | {
        id: string;
        name: string;
        description?: string;
        permissions?: string[];
      }[];
}
import { API_BASE_URL } from "@/config/api.config";
import { ToastService } from "./toast.service";
import { LoginData } from "@/types/login";

const API_BASE_URLS = import.meta.env.VITE_API_URL || "http://localhost:8000/";
export const API_URL = "http://localhost:8000/api/catalogue";

export const handleHttpErrors = async (response: Response) => {
  const text = await response.text();
  console.log("=== Raw response ===");
  console.log("Status:", response.status);
  console.log("URL:", response.url);
  console.log("Body:", text);
  console.log("====================");

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Réponse non-JSON (${response.status}): ${text.slice(0, 500)}`,
    );
  }

  if (!response.ok) {
    let errorMessage =
      data.message || data.detail || "Une erreur s'est produite";

    if (typeof data === "object" && !data.message && !data.detail) {
      errorMessage = Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
    }

    switch (response.status) {
      case 400:
        ToastService.error(`Données invalides - ${errorMessage}`);
        break;
      case 401:
        ToastService.error(`Non autorisé - ${errorMessage}`);
        break;
      case 403:
        ToastService.error(`Accès interdit - ${errorMessage}`);
        break;
      case 404:
        ToastService.error(`Ressource non trouvée - ${errorMessage}`);
        break;
      default:
        ToastService.error(errorMessage);
    }
    throw new Error(errorMessage);
  }

  if (data.message) {
    ToastService.success(data.message);
  }
  return data;
};

export const UserService = {
  createUser: async (userData: CreateUserData): Promise<UserResponse> => {
    try {
      const response = await fetch(`${API_BASE_URLS}api/accounts/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          //Tsy azoko
          //'Authorization': `Token ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData),
      });
      // console.log(response)
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Creation d'utilisateur échouée;", error);
      throw error;
    }
  },

  getUsers: async (): Promise<UserResponse[]> => {
    try {
      const response = await fetch(
        `${API_BASE_URLS}api/accounts/check-availability/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${localStorage.getItem("token")}`,
          },
        },
      );
      const data = await handleHttpErrors(response);
      return data.results || data; // Handle both paginated and non-paginated responses
    } catch (error) {
      console.error("Récupération des utilisateurs échouée:", error);
      throw error;
    }
  },

  updateUser: async (
    userId: string,
    userData: CreateUserData,
  ): Promise<UserResponse> => {
    try {
      const response = await fetch(`${API_BASE_URLS}api/users/${userId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...userData,
          id: userId,
        }),
      });
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Mise à jour de l'utilisateur échouée;", error);
      throw error;
    }
  },
  Login: async (userData: LoginData): Promise<UserResponse> => {
    try {
      const response = await fetch(`${API_BASE_URLS}api/accounts/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Mise à jour de l'utilisateur échouée;", error);
      throw error;
    }
  },
  verifyItem: async (parameter: string, value: string): Promise<boolean> => {
    try {
      const data = {
        [parameter]: value,
      };
      const response = await fetch(
        `${API_BASE_URLS}/user/check-availability/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Vérification de l'utilisateur échouée;", error);
      throw error;
    }
  },
  verifyItems: async (nom: string, prenom: string): Promise<boolean> => {
    try {
      const data = {
        last_name: nom,
        first_name: prenom,
      };
      // console.log(JSON.stringify(data))
      const response = await fetch(
        `${API_BASE_URLS}/user/check-availability/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(data),
        },
      );
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Vérification de l'utilisateur échouée;", error);
      throw error;
    }
  },
};

export const ProductService = {
  createProduct: async (
    productData: CreateProductData,
  ): Promise<ProductResponse> => {
    try {
      const formData = new FormData();
      Object.entries(productData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const response = await fetch(`${API_BASE_URLS}product/add/`, {
        method: "POST",
        body: formData,
      });
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Création du produit échouée:", error);
      throw error;
    }
  },
};

export const SupplierService = {
  createSupplier: async (
    supplierData: CreateSupplierData,
  ): Promise<SupplierResponse> => {
    try {
      // Transformer les données pour correspondre au format du backend
      const transformedData = {
        name: supplierData.name,
        email: supplierData.email,
        phone: supplierData.phone,
        address: supplierData.address,
        lead_time: supplierData.leadTime,
        min_order_quantity: supplierData.minOrderQuantity,
        max_order_quantity: supplierData.maxOrderQuantity,
        is_active: supplierData.isActive,
      };

      const response = await fetch(`${API_BASE_URLS}api/catalogue/suppliers/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(transformedData),
      });
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Création du fournisseur échouée:", error);
      throw error;
    }
  },

  updateSupplier: async (
    supplierId: string,
    supplierData: CreateSupplierData,
  ): Promise<SupplierResponse> => {
    try {
      const transformedData = {
        name: supplierData.name,
        email: supplierData.email,
        phone: supplierData.phone,
        address: supplierData.address,
        lead_time: supplierData.leadTime,
        min_order_quantity: supplierData.minOrderQuantity,
        max_order_quantity: supplierData.maxOrderQuantity,
        is_active: supplierData.isActive,
      };

      const response = await fetch(
        `${API_BASE_URLS}api/catalogue/suppliers/${supplierId}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Token ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(transformedData),
        },
      );
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Mise à jour du fournisseur échouée:", error);
      throw error;
    }
  },

  getAllSuppliers: async (): Promise<SupplierResponse> => {
    try {
      const response = await fetch(`${API_BASE_URLS}api/catalogue/suppliers/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${localStorage.getItem("token")}`, // ← ajouter cette ligne
        },
      });
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Récupération des fournisseurs échouée:", error);
      throw error;
    }
  },
};

//Api Role
export const RoleService = {
  createRole: async (roleData: RoleData): Promise<RoleResponse> => {
    try {
      const response = await fetch(`${API_BASE_URLS}api/role/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(roleData),
      });
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Création du rôle échouée:", error);
      throw error;
    }
  },
  updateRole: async (
    roleId: string,
    roleData: RoleData,
  ): Promise<RoleResponse> => {
    try {
      const response = await fetch(`${API_BASE_URLS}api/role/${roleId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(roleData),
      });
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Mise à jour du rôle échouée:", error);
      throw error;
    }
  },
  getAllRoles: async (): Promise<RoleResponse> => {
    try {
      const response = await fetch(`${API_BASE_URLS}api/role/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      });
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Récupération des rôles échouée:", error);
      throw error;
    }
  },
  getRoles: async (): Promise<RoleResponse> => {
    try {
      const response = await fetch(`${API_BASE_URLS}api/role/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      });
      return handleHttpErrors(response);
    } catch (error) {
      console.error("Récupération des rôles échouée:", error);
      throw error;
    }
  },
};

//Category API Service
class CategoryAPI {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const text = await response.text();
      //   console.log('Response text:', text);

      try {
        const result = JSON.parse(text); // Essayer de parser le JSON

        if (!response.ok) {
          throw new Error(
            result.message || `HTTP error! status: ${response.status}`,
          );
        }

        return result;
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        throw parseError;
      }
    } catch (error) {
      console.error(`Erreur API ${endpoint}:`, error);
      throw error;
    }
  }

  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.makeRequest<Category[]>("/categories/"); // /category/ → /categories/
  }

  async createCategory(
    categoryData: CategoryCreateData,
  ): Promise<ApiResponse<Category>> {
    return this.makeRequest<Category>("/categories/", {
      // /category/ → /categories/
      method: "POST",
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(
    id: string,
    categoryData: CategoryCreateData,
  ): Promise<ApiResponse<Category>> {
    return this.makeRequest<Category>(`/categories/${id}/`, {
      // /category/ → /categories/
      method: "PUT",
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/categories/${id}/`, {
      // /category/ → /categories/
      method: "DELETE",
    });
  }
}

export const getAccessToken = () => {
  return (
    localStorage.getItem("accessToken") || `${localStorage.getItem("token")}`
  );
};

export const categoryAPI = new CategoryAPI();
