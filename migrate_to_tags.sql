-- 将 customer_cases 的 life_stage 改为 tags

-- 1. 添加 tags 字段
ALTER TABLE customer_cases ADD COLUMN tags JSON COMMENT '标签列表';

-- 2. 将现有 life_stage 数据迁移到 tags（转为JSON数组）
UPDATE customer_cases
SET tags = JSON_ARRAY(life_stage)
WHERE life_stage IS NOT NULL AND life_stage != '';

-- 3. 对于空 life_stage，设置为空数组
UPDATE customer_cases
SET tags = JSON_ARRAY()
WHERE life_stage IS NULL OR life_stage = '';

-- 4. 删除旧的 life_stage 字段
ALTER TABLE customer_cases DROP COLUMN life_stage;

-- 5. 删除相关的索引（如果存在）
-- ALTER TABLE customer_cases DROP INDEX customer_ca_life_st_d3eb1b_idx;

SELECT '迁移完成！' as status;
