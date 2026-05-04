from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Alerte, Notification
from .serializers import AlerteSerializer, NotificationSerializer


class AlerteViewSet(viewsets.ModelViewSet):
    serializer_class = AlerteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Alerte.objects.filter(compteur__gt=-1)
        allowed = {f.name for f in Alerte._meta.get_fields()}
        for param, value in self.request.query_params.items():
            if param in allowed:
                qs = qs.filter(**{param: value})
        return qs

    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        qs = Alerte.objects.all()
        allowed = {f.name for f in Alerte._meta.get_fields()}
        for param, value in request.query_params.items():
            if param in allowed:
                qs = qs.filter(**{param: value})
        count, _ = qs.delete()
        return Response({'message': f"{count} alertes supprimées."})


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['priorite', 'status', 'channel', 'active', 'utilisateur']
    ordering_fields = ['priorite', 'creer_le', 'modifie_le']
    search_fields = ['message', 'status', 'channel']

    def get_queryset(self):
        return Notification.objects.filter(
            utilisateur=self.request.user
        ).order_by('-creer_le')

    @action(detail=False, methods=['post'])
    def tout_marquer_lu(self, request):
        count = self.get_queryset().filter(
            status=Notification.Status.NON_LU
        ).update(status=Notification.Status.LU)
        return Response({'message': f"{count} notifications marquées comme lues."})