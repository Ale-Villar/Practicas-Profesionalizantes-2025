# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0040_alter_user_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='cashmovement',
            name='hidden_from_history',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='order',
            name='cash_impacted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='order',
            name='cash_received',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='change_given',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
    ]