import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserService } from "@/services/api"

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Utilisateur",
    department: ""
  })

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setIsLoading(true)
    try {
      const res = await UserService.createUser({
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role,
        department: formData.department,
        temporaryPassword: false,
        password: formData.password,
      })

      if (res.token) {
        localStorage.setItem("token", res.token)
        localStorage.setItem("user", JSON.stringify(res.user))
        navigate("/dashboard")
      }
    } catch (err) {
      setError((err as Error).message || "Erreur lors de l'inscription.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />
      
      {/* Floating elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-500" />

      <div className="w-full flex items-center justify-center relative z-10">
        <Card className="w-full max-w-xl shadow-2xl border-0 bg-white/95 backdrop-blur-xl p-2 h-fit">
          <CardHeader className="space-y-3 text-center relative pb-6 pt-6">
            <NavLink 
              to="/" 
              className="absolute top-4 right-4 flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200 group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
              Retour
            </NavLink>
            
            <div className="flex justify-center mb-8 lg:hidden">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                <Package2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900">Créer un compte</CardTitle>
            <CardDescription className="text-slate-600 text-base">
              Rejoignez Predistock pour gérer votre inventaire avec l'IA
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">Prénom</Label>
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="h-12 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 px-4"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="h-12 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 px-4"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean@entreprise.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-12 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 px-4"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-medium text-slate-700">Département</Label>
                <Input
                  id="department"
                  placeholder="Ex: Logistique, Commercial..."
                  value={formData.department}
                  onChange={(e) => handleInputChange("department", e.target.value)}
                  className="h-12 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 px-4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-slate-700">Rôle</Label>
                <Select
                  onValueChange={(value) => handleInputChange("role", value)}
                  defaultValue="Utilisateur"
                >
                  <SelectTrigger className="h-12 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 px-4">
                    <SelectValue placeholder="Sélectionnez un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrateur">Administrateur</SelectItem>
                    <SelectItem value="Gestionnaire de Stock">Gestionnaire de Stock</SelectItem>
                    <SelectItem value="Analyste de Données">Analyste de Données</SelectItem>
                    <SelectItem value="Utilisateur">Utilisateur</SelectItem>
                    <SelectItem value="Invité">Invité</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Créez un mot de passe fort"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="h-12 text-sm pr-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 px-4"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-12 w-12"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword
                      ? <EyeOff className="h-5 w-5 text-slate-500" />
                      : <Eye className="h-5 w-5 text-slate-500" />
                    }
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmez votre mot de passe"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className="h-12 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 px-4"
                  required
                />
              </div>

              <Button type="submit" className="w-full h-12 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-4">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Création en cours...</span>
                  </div>
                ) : "Créer mon compte"}
              </Button>

              <div className="text-center">
                <span className="text-slate-600 text-sm">Déjà un compte ? </span>
                <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200">
                  Se connecter
                </Link>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}