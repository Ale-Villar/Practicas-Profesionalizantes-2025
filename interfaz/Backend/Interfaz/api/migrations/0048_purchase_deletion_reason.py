from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0047_cashregistersession_opening_declaration'),
    ]

    operations = [
        migrations.AddField(
            model_name='purchase',
            name='deletion_reason',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='purchase',
            name='deleted_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deleted_purchases', to=settings.AUTH_USER_MODEL),
        ),
    ]
