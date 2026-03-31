import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import predistockLogo from "@/image/predistock.png";
import { 
  BarChart3, 
  Brain, 
  TrendingUp, 
  ShoppingCart, 
  Zap, 
  Shield, 
  Database,
  LogIn,
  ChevronRight,
  Target,
  Activity,
  Boxes
} from "lucide-react";
import { NavLink } from "react-router-dom";

const Index = () => {
  const features = [
    {
      icon: Brain,
      title: "IA Prédictive",
      description: "Algorithmes avancés pour anticiper les besoins en stock",
      color: "ai"
    },
    {
      icon: BarChart3,
      title: "Analyse en Temps Réel",
      description: "Monitoring continu des ventes et tendances",
      color: "primary"
    },
    {
      icon: TrendingUp,
      title: "Optimisation Continue",
      description: "Amélioration automatique des prévisions",
      color: "success"
    },
    {
      icon: Shield,
      title: "Pipeline Sécurisé",
      description: "Traitement fiable des données Big Data",
      color: "primary"
    }
  ];

  const stats = [
    { label: "Précision", value: "94%", icon: Target, color:"text-green-500" },
    { label: "Données/sec", value: "10K+", icon: Activity, color:"text-blue-500" },
    { label: "Produits suivis", value: "50K+", icon: Boxes, color:"text-yellow-500" }
  ];

  return (
    <div className="min-h-screen bg-gray-100/20">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
                <img src={predistockLogo} 
                alt="Predistock Logo"
                className="h-14 w-14 object-contain border rounded-lg"
                />
              <div>
                <h1 className="text-xl font-bold text-foreground">PrediStock</h1>
                <p className="text-sm text-muted-foreground">Smart Inventory Prediction</p>
              </div>
            </div>
            <NavLink to="/login" className="flex items-center">
              <Button variant="outline" className="gap-2 bg-purple-700 text-white">
                  <LogIn className="w-4 h-4" />
                    Se connecter
              </Button>
            </NavLink>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in">
            <Badge variant="secondary" className="mb-6 px-4 py-2 bg-purple-700 text-white">
              IA & Big Data pour l'E-commerce
            </Badge>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
              Prévision de Stock Intelligente
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Pipeline automatisé de traitement de données alimentant un moteur de prévision 
              basé sur l'IA pour optimiser votre gestion de stock e-commerce en temps réel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button variant="link" size="lg" className="gap-2 text-purple-500/70">
                Commencer
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Voir la démo
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className={`text-3xl font-bold ${stat.color} mb-2`}>{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Technologies Avancées</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Une solution complète combinant Big Data, IA légère et automatisation 
              pour une gestion de stock optimale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                <CardHeader className="text-center pb-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 ${
                    feature.color === 'ai' ? 'bg-ai/10' :
                    feature.color === 'success' ? 'bg-success/10' :
                    'bg-primary/10'
                  }`}>
                    <feature.icon className={`w-8 h-8 ${
                      feature.color === 'ai' ? 'text-ai' :
                      feature.color === 'success' ? 'text-success' :
                      'text-primary'
                    }`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Pipeline de Données</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Processus automatisé de collecte, traitement et analyse des données 
              pour des prévisions précises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
                <Database className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Collecte</h3>
              <p className="text-muted-foreground">
                Ingestion en temps réel des données de ventes, stocks, 
                retours et comportements clients.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-float" style={{ animationDelay: '1s' }}>
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Traitement</h3>
              <p className="text-muted-foreground">
                Nettoyage, transformation et analyse des patterns 
                avec des algorithmes de machine learning.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-6 animate-float" style={{ animationDelay: '2s' }}>
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Prédiction</h3>
              <p className="text-muted-foreground">
                Génération de prévisions de stock optimisées 
                basées sur les tendances et facteurs saisonniers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-hero text-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Prêt à optimiser votre gestion de stock ?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Rejoignez les entreprises qui utilisent l'IA pour anticiper 
            leurs besoins et maximiser leur rentabilité.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <NavLink to="/login" className="flex items-center">
              <Button variant="secondary" size="lg" className="gap-2 bg-purple-700">
                <LogIn className="w-4 h-4" />
                  Connexion
              </Button>
            </NavLink>
            <Button variant="outline" size="lg" className=" border-purple/20 text-foreground hover:bg-purple-400 font-bold">
              Découvrir
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-primary-dark text-foreground">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-lg font-semibold">StockIA</span>
          </div>
          <p className="text-sm">
            Pipeline de prévision de stock basé sur l'IA et le Big Data
          </p>
          <div className="mt-6 pt-6 border-t border-white/20 text-xs">
            © 2024 StockIA. Projet de recherche en gestion intelligente de stock.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
