export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    // 1. 检查 API Key 是否存在 (调试第一步)
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      console.error("❌ 致命错误: Vercel 环境变量里找不到 AI_API_KEY！请去 Settings -> Environment Variables 检查。");
      throw new Error("Missing API Key");
    }

    // 2. 解析前端数据
    const { days, weight, height, head, gender, name } = await request.json();
    
    // 3. 准备提示词
    const genderText = gender === 'male' ? '男宝宝' : '女宝宝';
    const systemPrompt = `你是一位拥有20年经验的儿科专家。
    正在评估宝宝：${name} (${genderText}, 月龄 ${days}天)。
    当前数据：体重${weight}kg, 身高${height}cm${head ? `, 头围${head}cm` : ''}。
    
    请基于WHO标准进行评估。
    输出要求：
    1. 语气亲切、带有鼓励性，称呼宝宝名字。
    2. 包含【生长现状】(指出百分位水平)、【未来趋势预测】、【本月龄专属建议】。
    3. 必须使用 Markdown 格式，重要结论加粗。`;

    console.log(`✅ 正在呼叫 AI... 宝宝: ${name}`);

    // 4. 发送请求给硅基流动
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "请生成体检报告。" }
        ],
        temperature: 0.7
      })
    });

    // 5. 检查 AI 是否回复了错误 (比如余额不足)
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AI 服务商拒绝请求: ${response.status} - ${errorText}`);
      throw new Error(`AI API Error: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ AI 响应成功！");

    return new Response(JSON.stringify({ result: data.choices[0].message.content }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // 6. 捕获所有错误并打印到日志
    console.error("🔥 最终报错详情:", error);
    return new Response(JSON.stringify({ result: "专家正在忙碌，请稍后再试。(后台报错已记录)" }), { status: 500 });
  }
}