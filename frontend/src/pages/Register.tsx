import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package2, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserService } from "@/services/api"
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: formErrors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "Administrateur",
    }
  })

  const onSubmit = async (data: RegisterFormData) => {
    setError(null)
    setIsLoading(true)
    
    try {
      await UserService.createUser({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        department: data.department || "",
        temporaryPassword: false,
        password: data.password,
      })

      // Redirection vers la page de connexion après la création réussie du compte
      // Remarque : La notification de succès est gérée par handleHttpErrors dans api.ts
      navigate("/login")
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'inscription."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
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
            <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
            <CardDescription>
              Rejoignez Predistock pour gérer votre inventaire avec l'IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    {...register("firstName")}
                  />
                  {formErrors.firstName && (
                    <p className="text-red-500 text-sm">{formErrors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    {...register("lastName")}
                  />
                  {formErrors.lastName && (
                    <p className="text-red-500 text-sm">{formErrors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean@entreprise.com"
                  {...register("email")}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm">{formErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Département</Label>
                <Input
                  id="department"
                  placeholder="Ex: Logistique, Commercial..."
                  {...register("department")}
                />
                {formErrors.department && (
                  <p className="text-red-500 text-sm">{formErrors.department.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select
                  onValueChange={(value) => setValue("role", value as any)}
                  defaultValue="Administrateur"
                >
                  <SelectTrigger className="h-12 border-slate-200">
                    <SelectValue placeholder="Sélectionnez un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrateur">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.role && (
                  <p className="text-red-500 text-sm">{formErrors.role.message}</p>
                )}
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-500 text-sm">{formErrors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                />
                <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-red-500 text-sm">{formErrors.confirmPassword.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg transition-all duration-200" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Création en cours...</span>
                  </div>
                ) : "Créer mon compte"}
              </Button>

              <div className="text-center pt-2">
                <span className="text-slate-600 text-sm">Déjà un compte ? </span>
                <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800 font-semibold">
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