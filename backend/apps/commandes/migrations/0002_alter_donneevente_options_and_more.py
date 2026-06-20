import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalogue', '0006_alter_product_current_stock_and_more'),
        ('commandes', '0001_initial'),
        ('forecasting', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='donneevente',
            options={'ordering': ['-date_vente'], 'verbose_name': 'Vente', 'verbose_name_plural': 'Ventes'},
        ),
        migrations.AlterModelOptions(
            name='produitdonneevente',
            options={'verbose_name': 'Ligne de vente', 'verbose_name_plural': 'Lignes de vente'},
        ),
        migrations.RemoveField(
            model_name='donneevente',
            name='donne_supplementaire',
        ),
        migrations.RemoveField(
            model_name='donneevente',
            name='prix_unitaire',
        ),
        migrations.RemoveField(
            model_name='donneevente',
            name='quantite_vendu',
        ),
        migrations.RemoveField(
            model_name='donneevente',
            name='remise_applique',
        ),
        migrations.AddField(
            model_name='contenudans',
            name='bon_commande',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='lignes', to='commandes.boncommande'),
        ),
        migrations.AddField(
            model_name='contenudans',
            name='prix_unitaire',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='contenudans',
            name='quantite',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='donneevente',
            name='numero_vente',
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='donneevente',
            name='remise_globale',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='produitdonneevente',
            name='prix_unitaire',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='produitdonneevente',
            name='quantite',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='produitdonneevente',
            name='remise_applique',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='contenudans',
            name='recommandation',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='forecasting.recommandation'),
        ),
        migrations.AlterField(
            model_name='donneevente',
            name='montant_total',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='produitdonneevente',
            name='donnee_vente',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, related_name='lignes', to='commandes.donneevente'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='produitdonneevente',
            name='produit',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, to='catalogue.product'),
            preserve_default=False,
        ),
    ]
