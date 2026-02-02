# Generated migration to change life_stage to tags

from django.db import migrations, models


def migrate_life_stage_to_tags(apps, schema_editor):
    """将现有的 life_stage 数据迁移到 tags 字段"""
    CustomerCase = apps.get_model('api', 'CustomerCase')

    for case in CustomerCase.objects.all():
        if hasattr(case, 'life_stage') and case.life_stage:
            # 将原来的 life_stage 值放入 tags 数组
            case.tags = [case.life_stage]
            case.save()


def reverse_migration(apps, schema_editor):
    """回滚：将 tags 第一个值恢复到 life_stage"""
    CustomerCase = apps.get_model('api', 'CustomerCase')

    for case in CustomerCase.objects.all():
        if case.tags and len(case.tags) > 0:
            case.life_stage = case.tags[0]
            case.save()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0051_plancomparison'),
    ]

    operations = [
        # 1. 先添加新的 tags 字段
        migrations.AddField(
            model_name='customercase',
            name='tags',
            field=models.JSONField(blank=True, default=list, help_text='案例标签列表，例如：["扶幼保障期", "高收入", "海外资产配置"]', verbose_name='标签'),
        ),

        # 2. 数据迁移：将 life_stage 的值复制到 tags
        migrations.RunPython(migrate_life_stage_to_tags, reverse_migration),

        # 3. 删除旧的 life_stage 字段
        migrations.RemoveField(
            model_name='customercase',
            name='life_stage',
        ),
    ]
