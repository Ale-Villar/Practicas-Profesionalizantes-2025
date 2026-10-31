from decimal import Decimal

from django.db import migrations, models
from django.db.models import Q, Sum


def cash_until(CashMovement, moment):
    cash_entries = Q(type='Entrada') & (
        Q(payment_method__isnull=True) | Q(payment_method='') | Q(payment_method__icontains='efectivo')
    )
    totals = CashMovement.objects.filter(timestamp__lte=moment).aggregate(
        entradas=Sum('amount', filter=cash_entries),
        salidas=Sum('amount', filter=Q(type='Salida')),
    )
    return (totals['entradas'] or Decimal('0')) - (totals['salidas'] or Decimal('0'))


def fill_session_cash(apps, schema_editor):
    CashRegisterSession = apps.get_model('api', 'CashRegisterSession')
    CashMovement = apps.get_model('api', 'CashMovement')
    for session in CashRegisterSession.objects.all():
        session.opening_cash = cash_until(CashMovement, session.opened_at)
        if session.closed_at:
            session.closing_cash = cash_until(CashMovement, session.closed_at)
        session.save(update_fields=['opening_cash', 'closing_cash'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0043_supplier_supplied_products'),
    ]

    operations = [
        migrations.AddField(
            model_name='cashregistersession',
            name='opening_cash',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='cashregistersession',
            name='closing_cash',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='cashregistersession',
            name='declared_closing_cash',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.RunPython(fill_session_cash, migrations.RunPython.noop),
    ]
