export const config = {
  runtime: 'edge', // Edge 模式
};

export default async function handler(request) {
  try {
    // 1. 鉴权
    // ⚠️ 如果您之前是直接把 Key 写在代码里的，请在这里填入： const apiKey = "sk-xxxx";
    const apiKey = process.env.AI_API_KEY; 
    if (!apiKey) throw new Error("Missing API Key");

    // 2. 接收数据
    const { days, weight, height, head, gender, name, lang } = await request.json();
    
    // 3. 准备提示词 (保持 V6.0 的完美人设)
    const isEn = lang === 'en';
    const genderText = isEn ? (gender === 'male' ? 'boy' : 'girl') : (gender === 'male' ? '男宝宝' : '女宝宝');
    const ageText = isEn 
      ? `${Math.floor(days/30)} months ${days%30} days` 
      : `${Math.floor(days/30)}个月 ${days%30}天`;

    let systemPrompt;
    if (isEn) {
      systemPrompt = `You are "Dr. AI", a senior pediatrician. 
      Evaluating Baby: ${name} (${genderText}, Age: ${ageText}).
      Current Data: Weight ${weight}kg, Height ${height}cm${head ? `, Head ${head}cm` : ''}.

      Generate a report in Markdown format.
      Structure:
      ### 🩺 Health Report for ${name}
      **Dear parent, here is the assessment:**

      ### 1. Growth Assessment 📊
      (Analyze based on WHO standards. Use **Bold** for key status.)

      ### 2. Future Trends 🚀
      (What to expect next month.)

      ### 3. Expert Advice 💡
      (Feeding, sleep, or motor skills advice.)

      Tone: Warm, professional, encouraging.
      Language: STRICTLY ENGLISH.`;
    } else {
      systemPrompt = `你是一位拥有20年经验的资深儿科专家(Dr. AI)。
      正在评估宝宝：${name} (${genderText}, 月龄 ${ageText})。
      当前数据：体重${weight}kg, 身高${height}cm${head ? `, 头围${head}cm` : ''}。
      
      请严格按照以下 Markdown 格式输出：

      ### 🩺 ${name}宝宝的体检报告

      **亲爱的${name}宝宝家长，您好！我是您的AI儿科医生。让我们一起来看看${name}宝宝的表现吧！**

      ### 1. 生长现状评估 📊
      (基于WHO标准分析。语气要温暖鼓励。重点结论用 **加粗**。)

      ### 2. 未来趋势预测 🚀
      (简述接下来的生长重点)

      ### 3. 本月龄专属建议 💡
      (针对该月龄给出喂养、睡眠或大运动发展的具体建议)

      要求：
      1. 语气温暖、专业。
      2. 格式：标准 Markdown。
      3. 语言：中文。`;
    }

    // 4. 发送请求 (🌟 关键修改：换成速度更快的 Qwen 模型)
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        // 🔴 之前的 DeepSeek-V3 太慢导致超时，现在换成通义千问 72B (速度快，效果好)
        model: "Qwen/Qwen2.5-72B-Instruct", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate report" }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("SiliconFlow API Error:", errData);
      throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();

    // 5. 返回结果
    return new Response(JSON.stringify({ result: data.choices[0].message.content }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("AI Error:", error);
    // 返回更友好的错误提示
    return new Response(JSON.stringify({ error: "AI连接超时，请重试" }), { status: 500 });
  }
}