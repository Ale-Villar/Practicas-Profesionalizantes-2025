from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0044_cashregistersession_cash_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='lowstockreport',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='lowstockreport',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
