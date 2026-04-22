import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package2, Eye, EyeOff, TrendingUp, BarChart3, Shield } from "lucide-react"
import { LoginData } from "@/types/login"
import { UserService } from "@/services/api"
import predistockLogo from "@/image/predistock.png";

export default function Connexion() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const navigate = useNavigate()

   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    //HandleSubmit Logic
    const validationErrors: Record<string, string> = {}

    if (!email.trim()) {
      validationErrors.email = "L'email est requis"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      validationErrors.email = "L'email n'est pas valide"
    }
    
    if (!password) {
      validationErrors.password = "Le mot de passe est requis"
    } else if (password.length < 8) {
      validationErrors.password = "Le mot de passe doit contenir au moins 8 caractères"
    }

    setErrors(validationErrors)
    
    if (Object.keys(validationErrors).length > 0) {
      return
    }
    setIsLoading(true)
    
    try {
      const loginData: LoginData = {
        email,
        password,
      }
      const res = await UserService.Login(loginData)
      if(res.token) {
        localStorage.setItem("token", res.token)
        localStorage.setItem("user", JSON.stringify(res.user))
        navigate("/dashboard")
        console.log("Authentifié avec succès")
      }
    } catch (error) {
      console.error("Erreur de connexion:", error)
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

      <div className="w-full max-w-[1600px] flex items-center justify-center gap-24 relative z-10">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col items-start space-y-12 text-white max-w-2xl">
          <div className="flex items-center space-x-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-2xl">
                <img src={predistockLogo} 
                alt="Predistock Logo"
                className="h-20 w-20 object-contain border rounded-lg"
                />
            </div>
            <div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                Predistock
              </h1>
              <p className="text-blue-200 text-xl">Intelligence prédictive</p>
            </div>
          </div>
          
          <div className="space-y-10">
            <h2 className="text-5xl font-semibold leading-tight">
              Optimisez vos stocks avec l'intelligence artificielle
            </h2>
            <p className="text-blue-100 text-2xl leading-relaxed">
              Accédez à des prévisions précises, des analyses avancées et prenez des décisions éclairées pour votre inventaire.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 w-full">
            <div className="flex items-center space-x-6 p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <TrendingUp className="h-10 w-10 text-blue-300" />
              <div>
                <p className="font-semibold text-xl">Prévisions précises</p>
                <p className="text-base text-blue-200">Algorithmes avancés de ML</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <BarChart3 className="h-10 w-10 text-indigo-300" />
              <div>
                <p className="font-semibold text-xl">Analyses en temps réel</p>
                <p className="text-base text-blue-200">Données actualisées</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <Shield className="h-10 w-10 text-purple-300" />
              <div>
                <p className="font-semibold text-xl">Sécurité garantie</p>
                <p className="text-base text-blue-200">Données protégées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <Card className="w-full max-w-xl shadow-2xl border-0 bg-white/95 backdrop-blur-xl p-2">
          <CardHeader className="space-y-4 text-center relative pb-12 pt-10">
          
            <div className="flex justify-center mb-8 lg:hidden">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                <Package2 className="h-10 w-10 text-white" />
              </div>
            </div>
            
            <CardTitle className="text-4xl font-bold text-slate-900">
              Connexion
            </CardTitle>
            <CardDescription className="text-slate-600 text-xl">
              Accédez à votre espace Predistock
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="space-y-4">
                <Label htmlFor="email" className="text-base font-medium text-slate-700">
                  Adresse e-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemple@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`h-16 text-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 px-6 ${errors.email ? "border-red-500 ring-red-500" : ""}`}
                  required
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div className="space-y-4">
                <Label htmlFor="password" className="text-base font-medium text-slate-700">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Entrez votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-16 text-lg pr-16 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200 px-6"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-16 w-16"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-6 w-6" />
                    ) : (
                      <Eye className="h-6 w-6 text-slate-500" />
                    )}
                  </Button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-6 w-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="remember" className="text-base text-slate-600">
                    Se souvenir de moi
                  </Label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-base text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-4">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Connexion...</span>
                  </div>
                ) : (
                  "Se connecter"
                )}
              </Button>
              <div className="text-center pb-6">
                <span className="text-slate-600 text-lg">Vous n'avez pas de compte ? </span>
                <Link
                  to="/register"
                  className="text-lg text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200"
                >
                  Créez un compte
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}