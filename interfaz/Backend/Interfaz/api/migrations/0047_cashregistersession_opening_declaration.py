from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0046_cashregistersession_resolution'),
    ]

    operations = [
        migrations.AddField(
            model_name='cashregistersession',
            name='declared_opening_cash',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='cashregistersession',
            name='validated_opening_cash',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='cashregistersession',
            name='opening_cash_adjustment',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='cashregistersession',
            name='opening_cash_resolution',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
    ]
