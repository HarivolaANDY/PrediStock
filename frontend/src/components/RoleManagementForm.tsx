import { useState, useEffect } from "react";
import { Shield, Settings } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Role } from "@/types/types";
import { RoleService } from "@/services/api";

type PermissionCategoryKey = 'dashboard_analytics' | 'inventory_management' | 'user_management' | 'ai_datamodels';

interface RoleFormData {
  id?: number | string;
  name: string;
  description: string;
  prioritylevel: number;
  is_active: boolean;
  dashboard_analytics: string[];
  inventory_management: string[];
  user_management: string[];
  ai_datamodels: string[];
}

interface RoleManagementFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError?: (error: unknown) => void;
  role?: Role;
  mode: "create" | "edit";
}

export function RoleManagementForm({ open, onClose, role, mode, onSuccess }: RoleManagementFormProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<RoleFormData>({
    id: role?.id,
    name: role?.name || "",
    description: role?.description || "",
    prioritylevel: role?.prioritylevel || 1,
    is_active: role?.is_active ?? true,
    dashboard_analytics: [],
    inventory_management: [],
    user_management: [],
    ai_datamodels: [],
  });

  // Synchroniser formData lorsque le prop role change
  useEffect(() => {
    if (role && mode === "edit") {
      const parseIfString = (value: unknown): string[] => {
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.error('Error parsing permission:', e);
            return [];
          }
        }
        return Array.isArray(value) ? (value as string[]) : [];
      };

      setFormData({
        id: role.id,
        name: role.name || "",
        description: role.description || "",
        prioritylevel: role.prioritylevel || 1,
        is_active: role.is_active ?? true,
        dashboard_analytics: parseIfString(role.dashboard_analytics),
        inventory_management: parseIfString(role.inventory_management),
        user_management: parseIfString(role.user_management),
        ai_datamodels: parseIfString(role.ai_datamodels),
      });
    }
  }, [role, mode]);

  const availablePermissions: { category: string; key: PermissionCategoryKey; permissions: { id: string; label: string; description: string }[] }[] = [
    {
      category: "Dashboard & Analytics",
      key: "dashboard_analytics",
      permissions: [
        { id: "dashboard view", label: "View Dashboard", description: "Access to main dashboard" },
        { id: "AI models", label: "AI Models", description: "Access to AI model configurations" },
        { id: "analytics_view", label: "View Analytics", description: "Access to analytics and charts" },
        { id: "reports_generate", label: "Generate Reports", description: "Create and export reports" },
        { id: "reports_view", label: "View Reports", description: "View existing reports" },
      ],
    },
    {
      category: "Inventory Management",
      key: "inventory_management",
      permissions: [
        { id: "inventory_view", label: "View Inventory", description: "View stock and products" },
        { id: "inventory_edit", label: "Edit Inventory", description: "Modify stock levels and products" },
        { id: "inventory_import", label: "Import Data", description: "Import inventory data" },
        { id: "forecasting_view", label: "View Forecasting", description: "Access forecasting tools" },
        { id: "forecasting_edit", label: "Edit Forecasting", description: "Modify forecasting parameters" },
      ],
    },
    {
      category: "User & System Management",
      key: "user_management",
      permissions: [
        { id: "user_management", label: "User Management", description: "Manage user accounts" },
        { id: "role_management", label: "Role Management", description: "Create and edit roles" },
        { id: "system_settings", label: "System Settings", description: "Configure system settings" },
        { id: "audit_logs", label: "Audit Logs", description: "View system audit logs" },
      ],
    },
    {
      category: "AI & Data Models",
      key: "ai_datamodels",
      permissions: [
        { id: "data_management", label: "Data Management", description: "Manage data sources and quality" },
        { id: "data_import", label: "Data Import", description: "Import external data sources" },
        { id: "models_view", label: "View AI Models", description: "View AI model configurations" },
        { id: "models_configure", label: "Configure AI Models", description: "Modify AI model settings" },
      ],
    },
  ];

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const data = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      prioritylevel: formData.prioritylevel,
      is_active: formData.is_active,
      dashboard_analytics: JSON.stringify(formData.dashboard_analytics),
      inventory_management: JSON.stringify(formData.inventory_management),
      user_management: JSON.stringify(formData.user_management),
      ai_datamodels: JSON.stringify(formData.ai_datamodels),
    };

    try {
      setIsLoading(true);
      let response: { status?: string; message?: string };
      if (mode === "create") {
        response = await RoleService.createRole(data) as { status?: string };
      } else {
        response = await RoleService.updateRole(String(formData.id || ""), data) as { status?: string };
      }
      
      if (response.status === "success") {
        onSuccess();
        onClose();
      }

    } catch (error) {
      // Les erreurs sont déjà gérées par handleHttpErrors dans RoleService
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (permissionId: string, categoryKey: PermissionCategoryKey): void => {
    setFormData((prev) => {
      const current = prev[categoryKey];
      
      return {
        ...prev,
        [categoryKey]: current.includes(permissionId)
          ? current.filter((p: string) => p !== permissionId)
          : [...current, permissionId],
      };
    });
  };

  const toggleCategoryPermissions = (categoryKey: PermissionCategoryKey, categoryPermissions: { id: string }[]): void => {
    const categoryIds = categoryPermissions.map((p: { id: string }) => p.id);
    const current = formData[categoryKey];
    
    const allSelected = categoryIds.every((id: string) => current.includes(id));

    setFormData((prev) => ({
      ...prev,
      [categoryKey]: allSelected ? [] : categoryIds,
    }));
  };

  const countSelectedPermissions = () => {
    return (
      formData.dashboard_analytics.length +
      formData.inventory_management.length +
      formData.user_management.length +
      formData.ai_datamodels.length
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center p-4">
            <span>Chargement...</span>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {mode === "create" ? "Create New Role" : "Edit Role"}
              </DialogTitle>
              <DialogDescription>
                {mode === "create"
                  ? "Define a new role with specific permissions and access levels"
                  : "Update role information and permissions"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Role Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="roleName">Role Name *</Label>
                    <Input
                      id="roleName"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter role name (e.g., Stock Manager)"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.prioritylevel}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, prioritylevel: parseInt(e.target.value) || 1 }))
                      }
                      placeholder="1-10 (1 = highest)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the role's purpose and responsibilities"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active Role</Label>
                    <p className="text-sm text-muted-foreground">
                      Inactive roles cannot be assigned to users
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Permissions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Permissions</h3>
                  <Badge variant="outline" className="gap-1">
                    <Settings className="h-3 w-3" />
                    {countSelectedPermissions()} selected
                  </Badge>
                </div>

                <div className="space-y-6">
                  {availablePermissions.map((category, categoryIndex) => {
                    const categoryKey = category.key; // Already narrowed to PermissionCategoryKey
                    const allSelected = category.permissions.every((p) =>
                      formData[categoryKey].includes(p.id)
                    );

                    return (
                      <div key={categoryIndex} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{category.category}</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                           onClick={() => toggleCategoryPermissions(categoryKey, category.permissions)}
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {category.permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="space-y-0.5 flex-1">
                                <Label className="text-sm font-medium">{permission.label}</Label>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                              <Switch
                                checked={formData[categoryKey].includes(permission.id)}
                                onCheckedChange={() => togglePermission(permission.id, categoryKey)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Processing..." : mode === "create" ? "Create Role" : "Update Role"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}