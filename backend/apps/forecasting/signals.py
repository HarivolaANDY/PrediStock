from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from django_q.tasks import schedule
from .models import DataImport


@receiver(post_save, sender=DataImport)
def planifier_etl(sender, instance, created, **kwargs):
    if not created:
        return
    days_to_sunday = 6 - timezone.now().date().weekday()
    run_date = timezone.now() + timedelta(days=days_to_sunday)
    schedule(
        'django.core.management.call_command',
        "etl",
        instance.id,
        update_table=instance.update_table,
        name=f"ETL Task for DataImport ID {instance.id}",
        schedule_type='O',
        next_run=run_date,
    )