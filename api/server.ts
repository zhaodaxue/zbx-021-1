import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 造雪联调系统服务已启动，端口: ${PORT}`);
});
