from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0045_lowstockreport_logical_delete'),
    ]

    operations = [
        migrations.AddField(
            model_name='cashregistersession',
            name='validated_closing_cash',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='cashregistersession',
            name='cash_adjustment',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='cashregistersession',
            name='cash_resolution',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
    ]
