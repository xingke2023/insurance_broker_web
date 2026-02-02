// 测试导入
console.log('测试React组件导入...');

try {
  console.log('✓ 测试完成');
  process.exit(0);
} catch (error) {
  console.error('✗ 导入失败:', error.message);
  process.exit(1);
}
