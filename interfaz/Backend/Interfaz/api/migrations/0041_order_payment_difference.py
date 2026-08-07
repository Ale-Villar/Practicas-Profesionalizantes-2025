from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0040_order_cash_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='paid_total_at_change',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='payment_difference',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
    ]
