class RoleRequiredMiddleware:
    """
    Middleware de contrôle des rôles.
    La logique métier sera implémentée quand le système de rôles sera finalisé
    dans apps.accounts.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)